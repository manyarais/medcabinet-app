"use client";

// Browser Web Speech API mic. Hidden when unsupported / non-secure.
// Mobile (esp. iOS Safari) is buggy: isFinal often never fires, and stop()
// may leave the mic on — we accumulate all transcripts and force-abort.

import { useEffect, useRef, useState, type MouseEvent } from "react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onaudiostart?: (() => void) | null;
};

type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    length: number;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function isAppleBrowser() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.vendor?.includes("Apple") === true &&
      !navigator.userAgent.includes("Chrome") &&
      !navigator.userAgent.includes("CriOS") &&
      !navigator.userAgent.includes("FxiOS"));
}

function isMobileUa() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/** Rebuild full transcript — mobile Safari often never sets isFinal. */
function transcriptFromEvent(event: SpeechRecognitionResultEventLike): string {
  let text = "";
  for (let i = 0; i < event.results.length; i++) {
    text += event.results[i]![0]?.transcript ?? "";
  }
  return text.replace(/\s+/g, " ").trim();
}

function errorMessage(code: string): string | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone blocked. Allow mic for this site, then try again.";
    case "network":
      return "Speech needs an internet connection.";
    case "audio-capture":
      return "No microphone found.";
    case "no-speech":
      return "Didn’t catch that — tap mic and try again.";
    case "aborted":
      return null;
    default:
      return `Voice input error (${code}).`;
  }
}

type Props = {
  onTranscript: (text: string) => void;
  onFinal?: (text: string) => void;
  disabled?: boolean;
};

export function VoiceMicButton({
  onTranscript,
  onFinal,
  disabled = false,
}: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onFinalRef = useRef(onFinal);
  const lastTextRef = useRef("");
  const finalizedRef = useRef(false);
  const manualStopRef = useRef(false);
  const sessionRef = useRef(0);
  const startingRef = useRef(false);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onFinalRef.current = onFinal;
  }, [onTranscript, onFinal]);

  useEffect(() => {
    const ctor = getSpeechRecognitionCtor();
    setSupported(Boolean(ctor && window.isSecureContext));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      forceStopRecognition();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported) return null;

  function emitFinalIfNeeded() {
    const text = lastTextRef.current.trim();
    if (!text || finalizedRef.current) return;
    finalizedRef.current = true;
    onFinalRef.current?.(text);
  }

  function forceStopRecognition() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    // iOS Safari often ignores stop() unless start() is poked first.
    if (isAppleBrowser()) {
      try {
        recognition.start();
      } catch {
        // already started
      }
    }
    try {
      recognition.abort();
    } catch {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    }
    recognitionRef.current = null;
  }

  function stopListening() {
    manualStopRef.current = true;
    startingRef.current = false;
    sessionRef.current += 1;
    forceStopRecognition();
    setListening(false);
    emitFinalIfNeeded();
  }

  async function ensureMicPermission(): Promise<boolean> {
    // getUserMedia + SpeechRecognition fight over the audio session on iOS.
    if (isAppleBrowser()) return true;
    if (!navigator.mediaDevices?.getUserMedia) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) {
        track.stop();
      }
      return true;
    } catch {
      setToast("Microphone blocked. Allow mic for this site, then try again.");
      return false;
    }
  }

  async function startListening() {
    if (startingRef.current || listening) return;
    startingRef.current = true;
    manualStopRef.current = false;
    const session = ++sessionRef.current;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      startingRef.current = false;
      setToast("Voice isn’t supported here. Try Chrome or Safari.");
      return;
    }

    if (!window.isSecureContext) {
      startingRef.current = false;
      setToast("Voice needs HTTPS (or localhost).");
      return;
    }

    const allowed = await ensureMicPermission();
    if (!allowed || session !== sessionRef.current) {
      startingRef.current = false;
      return;
    }

    forceStopRecognition();

    const recognition = new Ctor();
    // continuous false + interim true is the least-bad combo across mobile.
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    if (typeof recognition.maxAlternatives === "number") {
      recognition.maxAlternatives = 1;
    }
    recognitionRef.current = recognition;
    lastTextRef.current = "";
    finalizedRef.current = false;

    recognition.onresult = (event) => {
      if (session !== sessionRef.current) return;
      const text = transcriptFromEvent(event);
      if (!text) return;
      lastTextRef.current = text;
      onTranscriptRef.current(text);

      // Desktop Chrome marks finals; still call onFinal once for those.
      let anyFinal = false;
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i]?.isFinal) anyFinal = true;
      }
      if (anyFinal && !isMobileUa()) {
        emitFinalIfNeeded();
      }
    };

    recognition.onerror = (event) => {
      if (session !== sessionRef.current) return;
      startingRef.current = false;
      setListening(false);
      const msg = errorMessage(event.error);
      if (msg) setToast(msg);
    };

    recognition.onend = () => {
      if (session !== sessionRef.current) return;
      startingRef.current = false;
      setListening(false);
      recognitionRef.current = null;

      // Mobile often ends without isFinal — treat end as final commit.
      if (!manualStopRef.current) {
        emitFinalIfNeeded();
      }

      if (!lastTextRef.current && !manualStopRef.current) {
        setToast((prev) => prev ?? "No words caught — tap mic and speak again.");
      }
    };

    try {
      recognition.start();
      if (session !== sessionRef.current) {
        forceStopRecognition();
        startingRef.current = false;
        return;
      }
      setListening(true);
      setToast(null);
      startingRef.current = false;
    } catch {
      startingRef.current = false;
      setListening(false);
      setToast("Could not start voice input. Try again.");
    }
  }

  function handleClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    if (listening || startingRef.current) {
      stopListening();
    } else {
      void startListening();
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-pressed={listening}
        aria-label={listening ? "Stop listening" : "Start voice input"}
        title={listening ? "Tap to stop" : "Tap to speak"}
        className={`inline-flex h-12 min-w-12 items-center justify-center gap-1 rounded-full px-3 text-xs font-semibold transition duration-150 ease-out active:scale-95 disabled:opacity-40 ${
          listening
            ? "bg-[var(--danger)] text-[var(--text-on-primary)] voice-mic-pulse"
            : "bg-[var(--surface-tint)] text-[var(--text-secondary)]"
        }`}
      >
        {listening ? (
          <>
            <span
              className="h-3 w-3 rounded-[2px] bg-current"
              aria-hidden
            />
            <span>Stop</span>
          </>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
            <path
              d="M5 11a7 7 0 0 0 14 0M12 18v3"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {toast && (
        <div
          role="status"
          className="absolute bottom-[calc(100%+0.35rem)] left-1/2 z-50 w-max max-w-[16rem] -translate-x-1/2 rounded-xl bg-[var(--text-primary)] px-3 py-2 text-xs font-medium text-[var(--surface)] shadow-[var(--shadow-raised)]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
