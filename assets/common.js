const STORE = "proofkitchen.v1";

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORE)) || { kitchens: [], waitlist: [] };
  } catch {
    return { kitchens: [], waitlist: [] };
  }
}
function saveState(state) {
  localStorage.setItem(STORE, JSON.stringify(state));
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d + (String(d).length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function daysUntil(lastService, intervalDays) {
  if (!lastService || !intervalDays) return null;
  const last = new Date(lastService + "T00:00:00");
  const due = new Date(last.getTime() + intervalDays * 86400000);
  return Math.ceil((due - new Date()) / 86400000);
}
function statusOf(lastService, intervalDays) {
  const n = daysUntil(lastService, intervalDays);
  if (n === null) return { key: "due", label: "Needs date" };
  if (n < 0) return { key: "late", label: `${Math.abs(n)}d overdue` };
  if (n <= 14) return { key: "due", label: `${n}d left` };
  return { key: "ok", label: `${n}d left` };
}
async function loadCities() {
  const paths = ["data/cities.json", "/data/cities.json", "../data/cities.json"];
  for (const p of paths) {
    try {
      const res = await fetch(p);
      if (res.ok) return res.json();
    } catch {}
  }
  throw new Error("Could not load city data");
}
function qs(name) {
  return new URLSearchParams(location.search).get(name);
}
