const NYC = "https://data.cityofnewyork.us/resource/43nn-pn8j.json";
const CHI = "https://data.cityofchicago.org/resource/4ijn-s7e5.json";

const KEYWORDS = {
  pest: /roach|rodent|mice|mouse|rat|vermin|insect|flies|cockroach|droppings/i,
  grease: /grease|fog|interceptor|oil|fat/i,
  hood: /hood|exhaust|ventilation|duct/i,
};

function classify(text) {
  const tags = [];
  const t = text || "";
  for (const [k, re] of Object.entries(KEYWORDS)) if (re.test(t)) tags.push(k);
  return tags;
}

function nycWhere(q) {
  const safe = q.replace(/'/g, "''");
  return `upper(dba) like '%${safe.toUpperCase()}%' OR upper(street) like '%${safe.toUpperCase()}%' OR zipcode='${safe}'`;
}

async function searchNyc(q) {
  const url = `${NYC}?$limit=40&$order=inspection_date DESC&$where=${encodeURIComponent(nycWhere(q))}`;
  const rows = await fetch(url).then((r) => r.json());
  return (rows || []).map((r) => ({
    city: "NYC",
    name: r.dba,
    address: [r.building, r.street, r.boro, r.zipcode].filter(Boolean).join(" "),
    date: r.inspection_date,
    result: r.grade ? `Grade ${r.grade} (score ${r.score ?? "—"})` : r.action || "Inspection",
    violation: r.violation_description || "",
    phone: r.phone || "",
    tags: classify(`${r.violation_description || ""} ${r.action || ""}`),
  }));
}

async function searchChi(q) {
  const safe = q.replace(/'/g, "''");
  const where = `upper(dba_name) like '%${safe.toUpperCase()}%' OR upper(address) like '%${safe.toUpperCase()}%' OR zip='${safe}'`;
  const url = `${CHI}?$limit=40&$order=inspection_date DESC&$where=${encodeURIComponent(where)}`;
  const rows = await fetch(url).then((r) => r.json());
  return (rows || []).map((r) => ({
    city: "Chicago",
    name: r.dba_name,
    address: [r.address, r.city, r.zip].filter(Boolean).join(" "),
    date: r.inspection_date,
    result: r.results || "",
    violation: r.violations || "",
    phone: "",
    tags: classify(`${r.violations || ""} ${r.results || ""}`),
  }));
}

function renderRows(rows, filter) {
  const filtered = rows.filter((r) => !filter || r.tags.includes(filter) || filter === "all");
  const el = document.getElementById("results");
  if (!filtered.length) {
    el.innerHTML = `<p class="fine">No matching inspections. Try a restaurant name, street, or ZIP in NYC or Chicago.</p>`;
    return;
  }
  el.innerHTML = filtered
    .map((r) => {
      const tags = r.tags.map((t) => `<span class="pill">${t}</span>`).join("") || `<span class="pill">other</span>`;
      const snippet = (r.violation || "").slice(0, 280);
      return `<article class="card">
        <div class="kicker">${r.city} · ${fmtDate(String(r.date).slice(0, 10))}</div>
        <h3>${r.name || "Unnamed"}</h3>
        <p>${r.address}</p>
        <p><strong>${r.result}</strong></p>
        <p class="fine">${snippet}${r.violation && r.violation.length > 280 ? "…" : ""}</p>
        <div>${tags}</div>
        <button class="btn secondary copy-lead" data-payload="${encodeURIComponent(
          JSON.stringify({ name: r.name, address: r.address, city: r.city, date: r.date, result: r.result, tags: r.tags })
        )}">Copy lead (no phone skip-trace)</button>
      </article>`;
    })
    .join("");
  el.querySelectorAll(".copy-lead").forEach((b) => {
    b.onclick = async () => {
      const payload = JSON.parse(decodeURIComponent(b.dataset.payload));
      const text = `${payload.name}\n${payload.address}\n${payload.city} · ${payload.result}\nTags: ${(payload.tags || []).join(", ")}`;
      await navigator.clipboard.writeText(text);
      b.textContent = "Copied";
    };
  });
}

async function run() {
  const q = document.getElementById("q").value.trim();
  const city = document.getElementById("city").value;
  const filter = document.getElementById("tag").value;
  if (q.length < 2) return;
  document.getElementById("results").innerHTML = `<p class="fine">Searching public records…</p>`;
  try {
    const parts = [];
    if (city !== "chicago") parts.push(searchNyc(q));
    if (city !== "nyc") parts.push(searchChi(q));
    const rows = (await Promise.all(parts)).flat();
    window.__rows = rows;
    renderRows(rows, filter);
  } catch (err) {
    document.getElementById("results").innerHTML = `<p class="notice">Could not reach an open-data portal. ${String(err)}</p>`;
  }
}

document.getElementById("go").onclick = run;
document.getElementById("q").addEventListener("keydown", (e) => {
  if (e.key === "Enter") run();
});
document.getElementById("tag").onchange = () => renderRows(window.__rows || [], document.getElementById("tag").value);
document.getElementById("vendor-form").onsubmit = (e) => {
  e.preventDefault();
  const state = loadState();
  state.waitlist = state.waitlist || [];
  state.waitlist.push({
    id: uid(),
    at: new Date().toISOString(),
    name: document.getElementById("v-name").value,
    email: document.getElementById("v-email").value,
    metro: document.getElementById("v-metro").value,
    trade: document.getElementById("v-trade").value,
  });
  saveState(state);
  document.getElementById("vendor-msg").textContent = "Saved on this device. When email/payments go live, founding vendors get $129/mo locked.";
};
