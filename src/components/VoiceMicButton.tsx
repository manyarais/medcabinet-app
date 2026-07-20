"use client";

// Browser Web Speech API mic control. Hidden when unsupported.
// Requires a secure context (HTTPS or localhost) — not plain http://LAN.
// Chrome/Edge work best; Firefox usually has no SpeechRecognition.

import { useEffect, useRef, useState, type MouseEvent } from "react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
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

function errorMessage(code: string): string | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone blocked. Allow mic for this site in the browser address bar.";
    case "network":
      return "Speech needs an internet connection (Chrome uses online recognition).";
    case "audio-capture":
      return "No microphone found. Check Windows sound settings.";
    case "no-speech":
      return "Didn’t catch that — tap the mic and try again.";
    case "aborted":
      return null;
    default:
      return `Voice input error (${code}). Try Chrome or Edge.`;
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
  const gotResultRef = useRef(false);
  const manualStopRef = useRef(false);

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
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, []);

  if (!supported) return null;

  function stopListening() {
    manualStopRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }

  async function ensureMicPermission(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) {
        track.stop();
      }
      return true;
    } catch {
      setToast("Microphone blocked. Allow mic for this site in the browser address bar.");
      return false;
    }
  }

  async function startListening() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setToast("Voice input isn’t supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (!window.isSecureContext) {
      setToast("Open http://127.0.0.1:3000 (or HTTPS). Voice needs a secure page.");
      return;
    }

    const allowed = await ensureMicPermission();
    if (!allowed) return;

    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    gotResultRef.current = false;
    manualStopRef.current = false;

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i]![0]!.transcript;
        if (event.results[i]!.isFinal) {
          finalText += piece;
        } else {
          interim += piece;
        }
      }
      const display = (finalText || interim).trim();
      if (display) {
        gotResultRef.current = true;
        onTranscriptRef.current(display);
      }
      if (finalText.trim()) {
        onFinalRef.current?.(finalText.trim());
      }
    };

    recognition.onerror = (event) => {
      setListening(false);
      const msg = errorMessage(event.error);
      if (msg) setToast(msg);
    };

    recognition.onend = () => {
      setListening(false);
      if (!gotResultRef.current && !manualStopRef.current) {
        setToast((prev) => prev ?? "Listening stopped — tap mic and speak clearly.");
      }
    };

    try {
      recognition.start();
      setListening(true);
      setToast(null);
    } catch {
      setListening(false);
      setToast("Could not start voice input. Refresh and try Chrome or Edge.");
    }
  }

  function handleClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    if (listening) {
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
        title="Voice input — Chrome or Edge on localhost/HTTPS"
        className={`inline-flex h-12 w-12 items-center justify-center rounded-full transition duration-150 ease-out active:scale-95 disabled:opacity-40 ${
          listening
            ? "bg-[var(--danger-bg)] text-[var(--danger-text)] voice-mic-pulse"
            : "bg-[var(--surface-tint)] text-[var(--text-secondary)] hover:text-[var(--primary)]"
        }`}
      >
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
      </button>

      {listening && (
        <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-[var(--danger-text)]">
          Listening…
        </span>
      )}

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
