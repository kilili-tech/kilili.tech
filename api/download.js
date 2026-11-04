import { LATEST } from "./_latest.js";

// One click on "Download" = +1 for the visitor's country, then the APK.
// Stored: a per-country total. Not stored: IP, device, browser, time of the click.
const BOT = /bot|crawl|spider|preview|fetch|curl|wget|python|monitor|headless/i;

export async function GET(request) {
  const headers = new Headers({ location: LATEST.file, "cache-control": "no-store" });
  const cookie = request.headers.get("cookie") || "";
  const ua = request.headers.get("user-agent") || "";
  const counted = /(?:^|;\s*)kd=1/.test(cookie);
  if (!counted && !BOT.test(ua)) {
    const cc = (request.headers.get("x-vercel-ip-country") || "XX").toUpperCase();
    await count(/^[A-Z]{2}$/.test(cc) ? cc : "XX");
    // Only "already counted today" is remembered, so a second tap doesn't count twice.
    headers.append("set-cookie", "kd=1; Max-Age=86400; Path=/; Secure; HttpOnly; SameSite=Lax");
  }
  return new Response(null, { status: 302, headers });
}

async function count(cc) {
  const url = process.env.KLS_SUPABASE_URL, key = process.env.KLS_SUPABASE_KEY, secret = process.env.KLS_COUNT_SECRET;
  if (!url || !key || !secret) return;
  try {
    await fetch(`${url}/rest/v1/rpc/kls_count`, {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: JSON.stringify({ secret, cc }),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // The download must never wait on the counter.
  }
}
