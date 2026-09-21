const TYPES = [
  ["grease_interceptor", "Grease interceptor / trap"],
  ["hood", "Hood & duct cleaning"],
  ["ansul", "Fire suppression (Ansul)"],
  ["backflow", "Backflow preventer"],
  ["pest", "Pest control"],
  ["health_permit", "Health / business permit"],
  ["food_manager", "Food manager certificate"],
  ["extinguisher", "Fire extinguishers"],
];

let citiesDoc = null;
let state = loadState();
let activeId = state.kitchens[0]?.id || null;

function kitchen() {
  return state.kitchens.find((k) => k.id === activeId) || null;
}

function render() {
  const list = document.getElementById("kitchen-list");
  const main = document.getElementById("kitchen-main");
  list.innerHTML = state.kitchens
    .map((k) => {
      const late = k.assets.some((a) => statusOf(a.lastService, a.intervalDays).key === "late");
      return `<button class="btn ${k.id === activeId ? "stamp" : "secondary"}" data-id="${k.id}" style="width:100%;margin-bottom:8px">
        ${k.name} ${late ? "· overdue" : ""}
      </button>`;
    })
    .join("") || `<p class="fine">No kitchens yet. Add one.</p>`;

  list.querySelectorAll("button[data-id]").forEach((b) => {
    b.onclick = () => {
      activeId = b.dataset.id;
      render();
    };
  });

  const k = kitchen();
  if (!k) {
    main.innerHTML = `<div class="card"><h3>Add your first kitchen</h3><p>Logs stay in this browser until you export a backup. Print an inspector pack anytime.</p></div>`;
    return;
  }

  const rows = k.assets
    .map((a) => {
      const st = statusOf(a.lastService, a.intervalDays);
      return `<tr>
        <td><strong>${a.label}</strong><div class="fine">${a.type.replaceAll("_", " ")}</div></td>
        <td>every ${a.intervalDays || "—"} days</td>
        <td>${fmtDate(a.lastService)}</td>
        <td><span class="badge ${st.key}">${st.label}</span></td>
        <td>${a.vendor || "—"}</td>
        <td class="no-print">
          <button class="btn secondary" data-svc="${a.id}">Log service</button>
        </td>
      </tr>`;
    })
    .join("");

  main.innerHTML = `
    <div class="card">
      <div class="kicker">${k.cityName || "Independent kitchen"}</div>
      <h2 style="font-family:var(--serif);margin:4px 0 8px">${k.name}</h2>
      <p class="fine">${k.address || ""}</p>
      <div class="toolbar">
        <button class="btn stamp" id="print-pack">Print inspector pack</button>
        <button class="btn secondary" id="add-asset">Add item</button>
        <button class="btn secondary" id="delete-k">Delete kitchen</button>
      </div>
      <table>
        <thead><tr><th>Item</th><th>Interval</th><th>Last service</th><th>Status</th><th>Vendor</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6">No items yet.</td></tr>`}</tbody>
      </table>
    </div>
    <div class="card no-print" id="asset-form" hidden>
      <h3>Add item</h3>
      <label>Type</label>
      <select id="a-type">${TYPES.map((t) => `<option value="${t[0]}">${t[1]}</option>`).join("")}</select>
      <label>Label</label>
      <input id="a-label" placeholder="Walk-in interceptor, 1000 gal">
      <label>Interval (days)</label>
      <input id="a-days" type="number" value="90">
      <label>Last service</label>
      <input id="a-last" type="date">
      <label>Vendor</label>
      <input id="a-vendor" placeholder="Hauler / hood cleaner">
      <label>Manifest / cert #</label>
      <input id="a-manifest">
      <div class="toolbar"><button class="btn" id="save-asset">Save item</button></div>
    </div>
  `;

  main.querySelector("#print-pack").onclick = () => printPack(k);
  main.querySelector("#add-asset").onclick = () => {
    document.getElementById("asset-form").hidden = false;
  };
  main.querySelector("#delete-k").onclick = () => {
    if (!confirm("Delete this kitchen?")) return;
    state.kitchens = state.kitchens.filter((x) => x.id !== k.id);
    activeId = state.kitchens[0]?.id || null;
    saveState(state);
    render();
  };
  main.querySelectorAll("[data-svc]").forEach((b) => {
    b.onclick = () => {
      const asset = k.assets.find((a) => a.id === b.dataset.svc);
      const date = prompt("Service date (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));
      if (!date) return;
      asset.lastService = date;
      const vendor = prompt("Vendor name", asset.vendor || "");
      if (vendor !== null) asset.vendor = vendor;
      const man = prompt("Manifest / certificate #", asset.manifest || "");
      if (man !== null) asset.manifest = man;
      saveState(state);
      render();
    };
  });
  const saveBtn = main.querySelector("#save-asset");
  if (saveBtn) {
    saveBtn.onclick = () => {
      k.assets.push({
        id: uid(),
        type: document.getElementById("a-type").value,
        label: document.getElementById("a-label").value || document.getElementById("a-type").selectedOptions[0].text,
        intervalDays: Number(document.getElementById("a-days").value || 90),
        lastService: document.getElementById("a-last").value,
        vendor: document.getElementById("a-vendor").value,
        manifest: document.getElementById("a-manifest").value,
      });
      saveState(state);
      render();
    };
  }
}

function printPack(k) {
  const w = window.open("", "_blank");
  const rows = k.assets
    .map((a) => {
      const st = statusOf(a.lastService, a.intervalDays);
      return `<tr><td>${a.label}</td><td>${a.intervalDays}d</td><td>${fmtDate(a.lastService)}</td><td>${st.label}</td><td>${a.vendor || ""}</td><td>${a.manifest || ""}</td></tr>`;
    })
    .join("");
  w.document.write(`<!doctype html><title>Inspector pack — ${k.name}</title>
    <style>
      body{font-family:Georgia,serif;padding:32px;color:#1f1a16}
      h1{margin:0}
      table{width:100%;border-collapse:collapse;margin-top:18px}
      th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}
      .stamp{border:3px solid #b42318;color:#b42318;display:inline-block;padding:4px 10px;transform:rotate(-6deg);font-weight:700}
      p{color:#444}
    </style>
    <p class="stamp">INSPECTOR PACK</p>
    <h1>${k.name}</h1>
    <p>${k.address || ""} · ${k.cityName || ""}</p>
    <p>Generated ${new Date().toLocaleString()} by ProofKitchen. Not a city form. Attach original manifests.</p>
    <table>
      <thead><tr><th>Item</th><th>Interval</th><th>Last service</th><th>Status</th><th>Vendor</th><th>Manifest / cert</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p>I keep original hauler manifests and hood-cleaning certificates on site.</p>
    <p>Manager signature ______________________ &nbsp; Date ______________</p>`);
  w.document.close();
  w.focus();
  w.print();
}

function addKitchen() {
  const name = document.getElementById("k-name").value.trim();
  const address = document.getElementById("k-address").value.trim();
  const slug = document.getElementById("k-city").value;
  if (!name) return;
  const city = citiesDoc.cities.find((c) => c.slug === slug);
  const assets = (city?.defaultAssets || []).map((a) => ({ ...a, id: uid(), lastService: "", vendor: "", manifest: "" }));
  const k = { id: uid(), name, address, citySlug: slug, cityName: city?.name || "", assets };
  state.kitchens.push(k);
  activeId = k.id;
  saveState(state);
  render();
}

async function boot() {
  citiesDoc = await loadCities();
  const sel = document.getElementById("k-city");
  sel.innerHTML = citiesDoc.cities.map((c) => `<option value="${c.slug}">${c.name}</option>`).join("");
  const pre = qs("city");
  if (pre && [...sel.options].some((o) => o.value === pre)) sel.value = pre;
  document.getElementById("add-kitchen").onclick = addKitchen;
  document.getElementById("export-json").onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "proofkitchen-backup.json";
    a.click();
  };
  document.getElementById("import-json").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then((t) => {
      state = JSON.parse(t);
      activeId = state.kitchens[0]?.id || null;
      saveState(state);
      render();
    });
  };
  render();
}

boot();
