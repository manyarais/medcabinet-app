// Polls /api/reminders/dispatch so Twilio overdue calls work without the browser.
//
// Local:
//   npm run reminders:watch
//
// Point at Vercel for a live demo (Twilio keys live on Vercel) — PowerShell:
//   $env:REMINDER_DISPATCH_URL="https://YOUR-APP.vercel.app"
//   npm run reminders:watch
//
const BASE = process.env.REMINDER_DISPATCH_URL ?? "http://localhost:3000";
const SECRET = process.env.REMINDER_DISPATCH_SECRET?.trim() ?? "";
const INTERVAL_MS = Number(process.env.REMINDER_DISPATCH_INTERVAL_MS ?? 60_000);

async function tick() {
  const headers = { "Content-Type": "application/json" };
  if (SECRET) headers["x-reminder-secret"] = SECRET;

  try {
    const res = await fetch(`${BASE}/api/reminders/dispatch`, {
      method: "POST",
      headers,
      body: "{}",
    });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      console.log(
        `[${new Date().toLocaleTimeString()}] dispatch returned non-JSON (${res.status}):`,
        text.slice(0, 200) || "(empty)",
      );
      return;
    }
    const time = new Date().toLocaleTimeString();
    if (!res.ok) {
      console.log(`[${time}] dispatch error ${res.status}:`, json.error ?? json);
      return;
    }
    if (json.skipped) {
      console.log(`[${time}] skipped: ${json.reason}`);
      return;
    }
    if (json.called?.length) {
      console.log(
        `[${time}] called:`,
        json.called.map((c) => c.brandName).join(", "),
      );
      return;
    }
    if (json.reason) {
      console.log(`[${time}] ${json.reason}`);
      return;
    }
    console.log(
      `[${time}] ok - overdue=${json.overdueCount ?? 0}, alreadyCalled=${json.alreadyCalledCount ?? 0}`,
    );
  } catch (err) {
    console.log(
      `[${new Date().toLocaleTimeString()}] could not reach ${BASE}:`,
      err.message,
    );
  }
}

console.log(`Pillio reminder watcher -> ${BASE} every ${INTERVAL_MS / 1000}s`);
console.log("Keep this running alongside npm run dev. Ctrl+C to stop.");
tick();
setInterval(tick, INTERVAL_MS);
