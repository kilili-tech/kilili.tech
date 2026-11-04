"use strict";
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const fmt = (n) => Number(n).toLocaleString("en");
  const FOUNDING = 1000; // below this, invite founding members instead of showing a small number

  // ---- Share
  const share = $("[data-share]");
  if (share) share.addEventListener("click", async () => {
    const data = { title: "KILILI", text: "Chat, call and sell with no data. Get KILILI free:", url: "https://kilili.tech" };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(`${data.text} ${data.url}`); share.textContent = "Link copied"; }
    } catch { /* closed */ }
  });

  // ---- Mobile menu
  const burger = $("[data-burger]"), menu = $("#menu");
  if (burger && menu) {
    const set = (open) => {
      menu.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    burger.addEventListener("click", () => set(!menu.classList.contains("open")));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
  }

  // ---- Map
  const canvas = $("#map");
  const ctx = canvas.getContext("2d");
  let map = null, hits = [], t0 = performance.now();
  const W = 1080, H = 440;

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || W;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * (H / W) * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }
  const project = (lat, lon) => [((lon + 180) / 360) * W, ((map.lat0 - lat) / (map.rows.length * map.step)) * H];

  function draw(now) {
    if (!map) return;
    ctx.clearRect(0, 0, W, H);
    const cw = W / map.cols, rh = H / map.rows.length;
    ctx.fillStyle = "#2c3236";
    for (let j = 0; j < map.rows.length; j++) {
      const hex = map.rows[j], bits = hex.length * 4, pad = bits - map.cols;
      for (let i = 0; i < map.cols; i++) {
        const b = i + pad, nib = parseInt(hex[b >> 2], 16);
        if (nib & (8 >> (b & 3))) { ctx.beginPath(); ctx.arc(i * cw + cw / 2, j * rh + rh / 2, 1.7, 0, 6.283); ctx.fill(); }
      }
    }
    const t = (now - t0) / 1000;
    for (const h of hits) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2 + h.phase);
      const r = h.r * (1 + 0.35 * pulse);
      const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r * 3.2);
      g.addColorStop(0, "rgba(185,242,39,0.95)");
      g.addColorStop(0.25, "rgba(185,242,39,0.45)");
      g.addColorStop(1, "rgba(185,242,39,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(h.x, h.y, r * 3.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#e9ffb0";
      ctx.beginPath(); ctx.arc(h.x, h.y, Math.max(2, r * 0.45), 0, 6.283); ctx.fill();
    }
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) requestAnimationFrame(draw);
  }

  function setHits(countries) {
    const max = Math.max(1, ...countries.map((c) => Number(c.n)));
    hits = countries.filter((c) => map.c[c.country]).map((c, k) => {
      const [lat, lon] = map.c[c.country];
      const [x, y] = project(lat, lon);
      return { x, y, r: 4 + 9 * (Math.log(1 + Number(c.n)) / Math.log(1 + max)), phase: k * 1.7 };
    });
  }

  function showStats(s) {
    const counter = $("[data-counter]"), top = $("[data-top]");
    const named = (s.countries || []).filter((c) => c.country !== "XX");
    if (s.total >= FOUNDING) {
      counter.innerHTML = `<b>${fmt(s.total)}</b> downloads in <b>${fmt(named.length)}</b> countries`;
      top.replaceChildren(...named.slice(0, 8).map((c) => {
        const li = document.createElement("li");
        li.textContent = map.c[c.country] ? map.c[c.country][2] : c.country;
        const b = document.createElement("b"); b.textContent = fmt(c.n); li.append(b);
        return li;
      }));
    } else if (s.total > 0) {
      counter.innerHTML = `Founding members wanted: <b>${fmt(FOUNDING - s.total)}</b> places left in the first 1,000.`;
    }
    if (map) setHits(named);
    for (const p of s.prices || []) {
      const el = $(`[data-price="${p.kind}"]`), d = $(`[data-days="${p.kind}"]`);
      if (el) el.textContent = `GHS ${(p.amount_minor / 100).toLocaleString("en", { maximumFractionDigits: 2 })}`;
      if (d) d.textContent = p.days;
    }
    const L = s.latest;
    if (L) {
      const mb = (L.size / 1048576).toFixed(1);
      $$("[data-build]").forEach((e) => (e.textContent = `Free · Android 8 or newer · ${mb} MB`));
      $$("[data-ver], [data-ver-foot]").forEach((e) => (e.textContent = L.version));
      const sha = $("[data-sha]"), sig = $("[data-signer]");
      if (sha) sha.textContent = L.sha256;
      if (sig) sig.textContent = L.signer;
    }
  }

  size();
  addEventListener("resize", () => { size(); });
  Promise.all([
    fetch("/map.json").then((r) => r.json()),
    fetch("/api/stats").then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]).then(([m, s]) => {
    map = m;
    if (s) showStats(s);
    requestAnimationFrame(draw);
  }).catch(() => { /* the page works without the map */ });
})();
