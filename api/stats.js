import { LATEST } from "./_latest.js";

// Public numbers for the page: downloads per country, live pass prices, the current build.
export async function GET() {
  const url = process.env.KLS_SUPABASE_URL, key = process.env.KLS_SUPABASE_KEY;
  let countries = [], prices = [];
  if (url && key) {
    const call = (fn) => fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(2500),
    }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
    [countries, prices] = await Promise.all([call("kls_totals"), call("kls_prices")]);
  }
  const total = countries.reduce((s, c) => s + Number(c.n || 0), 0);
  return Response.json(
    { total, countries, prices, latest: LATEST },
    { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=600" } },
  );
}
