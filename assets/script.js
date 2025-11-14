
const REPO = "Prufrock94/HortiRobotCatalog";

let robots = [];
let filtered = [];
let currentSort = { key: "merk", dir: "asc" };

document.addEventListener("DOMContentLoaded", () => {
  initModal();
  loadRobots();
});

async function loadRobots() {
  try {
    const res = await fetch("data/robots.json");
    robots = await res.json();
    filtered = [...robots];
    initFilters();
    renderTable();
    renderResultCount();
  } catch (e) {
    console.error("Kon robots.json niet laden:", e);
  }
}

/* ---------- Mapping helpers ---------- */

function normalise(str) {
  return (str || "").toString().toLowerCase().trim();
}

function getHandelingIcon(h) {
  const x = normalise(h);
  if (x.includes("wied")) return "🧹";
  if (x.includes("zaai")) return "🌱";
  if (x.includes("oogst")) return "✂️";
  if (x.includes("scout") || x.includes("detect")) return "🎯";
  if (x.includes("snoei")) return "✂️";
  if (x.includes("spuit") || x.includes("spray")) return "💧";
  if (x.includes("transp") || x.includes("carrier")) return "🚜";
  return "⚙️";
}

function getGewasIcon(g) {
  const x = normalise(g);
  if (x.includes("sla") || x.includes("leaf")) return "🥬";
  if (x.includes("prei") || x.includes("leek")) return "🧅";
  if (x.includes("wortel") || x.includes("carrot")) return "🥕";
  if (x.includes("ui") || x.includes("onion")) return "🧅";
  if (x.includes("biet")) return "🍠";
  if (x.includes("spinazie") || x.includes("spinach")) return "🌿";
  if (x.includes("tomaat")) return "🍅";
  if (x.includes("paprika") || x.includes("peper")) return "🌶️";
  if (x.includes("kool") || x.includes("broccoli")) return "🥦";
  return "🌱";
}

function getGewasChipClass(g) {
  const x = normalise(g);
  if (x.includes("sla") || x.includes("spinazie")) return "chip-green";
  if (x.includes("prei") || x.includes("ui")) return "chip-amber";
  if (x.includes("wortel")) return "chip-orange";
  if (x.includes("tomaat") || x.includes("paprika") || x.includes("peper")) return "chip-red";
  if (x.includes("biet")) return "chip-red";
  if (x.includes("kool") || x.includes("broccoli")) return "chip-purple";
  return "chip-gray";
}

function getHandelingChipClass(h) {
  const x = normalise(h);
  if (x.includes("wied")) return "chip-blue";
  if (x.includes("zaai")) return "chip-orange";
  if (x.includes("oogst")) return "chip-green";
  if (x.includes("scout") || x.includes("detect")) return "chip-purple";
  if (x.includes("spuit")) return "chip-red";
  if (x.includes("transp")) return "chip-gray";
  return "chip-gray";
}

function getOntwikkelingIcon(stage) {
  const x = normalise(stage);
  if (x === "onderzoek") return "🔬";
  if (x === "prototype") return "🧪";
  if (x === "start-up" || x === "startup" || x === "start up") return "🚀";
  if (x === "scale-up" || x === "scaleup" || x === "scale up") return "📈";
  if (x === "commercieel" || x === "commercial") return "🛒";
  return "❓";
}

/* ---------- Rendering helpers ---------- */

function renderChip(text, type) {
  if (!text) return "";
  const icon =
    type === "gewas" ? getGewasIcon(text) : getHandelingIcon(text);
  const cls =
    type === "gewas" ? getGewasChipClass(text) : getHandelingChipClass(text);
  return `<span class="chip ${cls}"><span class="chip-icon">${icon}</span><span>${text}</span></span>`;
}

/* ---------- Filters ---------- */

function initFilters() {
  const merkSet = new Set();
  const gewasSet = new Set();
  const handSet = new Set();
  const ontSet = new Set();

  robots.forEach((r) => {
    if (r.merk) merkSet.add(r.merk);
    (r.gewassen || []).forEach((g) => gewasSet.add(g));
    (r.handelingen || []).forEach((h) => handSet.add(h));
    if (r.ontwikkeling) ontSet.add(r.ontwikkeling);
  });

  fillSelect("filter-merk", merkSet);
  fillSelect("filter-gewassen", gewasSet);
  fillSelect("filter-handelingen", handSet);
  fillSelect("filter-ontwikkeling", ontSet);

  document
    .querySelectorAll("#filters select")
    .forEach((sel) => sel.addEventListener("change", applyFilters));
  document
    .getElementById("search-input")
    .addEventListener("input", applyFilters);
}

function fillSelect(id, set) {
  const sel = document.getElementById(id);
  const values = Array.from(set).sort((a, b) =>
    a.localeCompare(b, "nl", { sensitivity: "base" })
  );
  values.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    sel.appendChild(opt);
  });
}

function applyFilters() {
  const m = document.getElementById("filter-merk").value;
  const g = document.getElementById("filter-gewassen").value;
  const h = document.getElementById("filter-handelingen").value;
  const o = document.getElementById("filter-ontwikkeling").value;
  const q = normalise(document.getElementById("search-input").value);

  filtered = robots.filter((r) => {
    if (m && r.merk !== m) return false;
    if (g && !(r.gewassen || []).includes(g)) return false;
    if (h && !(r.handelingen || []).includes(h)) return false;
    if (o && normalise(r.ontwikkeling) !== normalise(o)) return false;

    if (q) {
      const haystack = [
        r.merk,
        r.robot,
        ...(r.gewassen || []),
        ...(r.handelingen || []),
        r.ontwikkeling,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  applySort();
  renderTable();
  renderResultCount();
}

/* ---------- Sorteren ---------- */

function parsePrice(p) {
  if (!p) return NaN;
  const m = p.toString().match(/[0-9]+([\.,][0-9]+)?/g);
  if (!m) return NaN;
  const nums = m.map((x) => parseFloat(x.replace(",", ".")));
  if (!nums.length) return NaN;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function applySort() {
  const { key, dir } = currentSort;
  filtered.sort((a, b) => {
    let va = a[key];
    let vb = b[key];

    if (key === "kostprijs") {
      va = parsePrice(va);
      vb = parsePrice(vb);
    }

    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;

    if (typeof va === "string" && typeof vb === "string") {
      const res = va.localeCompare(vb, "nl", { sensitivity: "base" });
      return dir === "asc" ? res : -res;
    }

    const res = va > vb ? 1 : va < vb ? -1 : 0;
    return dir === "asc" ? res : -res;
  });
}

function setSort(key) {
  if (currentSort.key === key) {
    currentSort.dir = currentSort.dir === "asc" ? "desc" : "asc";
  } else {
    currentSort.key = key;
    currentSort.dir = "asc";
  }
  applySort();
  renderTable();
}

/* ---------- Tabelrendering ---------- */

function renderTable() {
  const container = document.getElementById("table-container");

  const rowsHtml = filtered
    .map((r, idx) => {
      const gewasChips = (r.gewassen || [])
        .map((g) => renderChip(g, "gewas"))
        .join("");
      const handChips = (r.handelingen || [])
        .map((h) => renderChip(h, "handeling"))
        .join("");
      const devIcon = getOntwikkelingIcon(r.ontwikkeling);
      const devTitle = r.ontwikkeling || "Onbekend";

      const foto =
        r.foto && r.foto.trim().length
          ? `<div class="cell-thumb-inner"><img src="${r.foto}" alt="Foto ${r.robot}" loading="lazy" /></div>`
          : `<div class="cell-thumb-inner"><span class="cell-thumb-placeholder">geen foto</span></div>`;

      return `
      <tr data-index="${idx}">
        <td class="cell-thumb">${foto}</td>
        <td>${r.merk || ""}</td>
        <td>${r.robot || ""}</td>
        <td><div class="chips-row">${gewasChips}</div></td>
        <td><div class="chips-row">${handChips}</div></td>
        <td>
          <span class="dev-pill" title="${devTitle}">
            <span class="dev-icon">${devIcon}</span>
            <span class="dev-label">${devTitle || "n.v.t."}</span>
          </span>
        </td>
        <td>${r.kostprijs || ""}</td>
      </tr>`;
    })
    .join("");

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th></th>
          <th class="sortable" data-sort="merk">Merk</th>
          <th class="sortable" data-sort="robot">Robot</th>
          <th>Gewassen</th>
          <th>Handelingen</th>
          <th class="sortable" data-sort="ontwikkeling">Ontwikkeling</th>
          <th class="sortable" data-sort="kostprijs">Kostprijs</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="7">Geen robots gevonden met deze filters.</td></tr>`}
      </tbody>
    </table>
  `;

  document.querySelectorAll("th.sortable").forEach((th) => {
    th.classList.remove("sorted-asc", "sorted-desc");
    const key = th.dataset.sort;
    if (key === currentSort.key) {
      th.classList.add(
        currentSort.dir === "asc" ? "sorted-asc" : "sorted-desc"
      );
    }
    th.onclick = () => setSort(key);
  });

  document
    .querySelectorAll("#table-container tbody tr")
    .forEach((tr, idx) => {
      tr.addEventListener("click", () => {
        document
          .querySelectorAll("#table-container tbody tr")
          .forEach((row) => row.classList.remove("active"));
        tr.classList.add("active");
        const originalIndex = robots.indexOf(filtered[idx]);
        showDetail(robots[originalIndex]);
      });
    });
}

function renderResultCount() {
  const el = document.getElementById("result-count");
  const total = robots.length;
  const n = filtered.length;
  if (!el) return;
  el.textContent =
    n === total
      ? `${n} robots`
      : `${n} robots (van in totaal ${total})`;
}

/* ---------- Detailpaneel ---------- */

function showDetail(robot) {
  const panel = document.getElementById("detail-panel");
  if (!robot) {
    panel.classList.add("hidden");
    panel.innerHTML = "";
    return;
  }

  const gewasChips = (robot.gewassen || [])
    .map((g) => renderChip(g, "gewas"))
    .join("");
  const handChips = (robot.handelingen || [])
    .map((h) => renderChip(h, "handeling"))
    .join("");

  const devIcon = getOntwikkelingIcon(robot.ontwikkeling);
  const devTitle = robot.ontwikkeling || "Onbekend";

  const foto =
    robot.foto && robot.foto.trim().length
      ? `<img src="${robot.foto}" alt="Foto ${robot.robot}" loading="lazy" />`
      : `<span class="cell-thumb-placeholder">Geen foto</span>`;

  const linksHtml = (robot.links || [])
    .map(
      (l) =>
        `<li><a href="${l.url}" target="_blank" rel="noopener noreferrer">${l.label}</a></li>`
    )
    .join("");

  const opmerkingen = robot.opmerkingen || "";

  panel.innerHTML = `
    <div class="detail-header">
      <div class="detail-thumb">
        ${foto}
      </div>
      <div class="detail-main">
        <h2 class="detail-title">${robot.robot || ""}</h2>
        <p class="detail-sub">
          ${robot.merk || ""}${
    robot.kostprijs ? " • " + robot.kostprijs : ""
  }
        </p>
        <div class="detail-tags">
          <span class="dev-pill" title="${devTitle}">
            <span class="dev-icon">${devIcon}</span>
            <span class="dev-label">${devTitle || "n.v.t."}</span>
          </span>
        </div>
        <div class="detail-tags">
          ${gewasChips}
        </div>
        <div class="detail-tags">
          ${handChips}
        </div>
      </div>
    </div>

    <div>
      <h3 class="detail-section-title">Links en referenties</h3>
      <ul>
        ${
          linksHtml ||
          "<li><span class='hint'>Nog geen links toegevoegd.</span></li>"
        }
      </ul>
    </div>

    <div>
      <h3 class="detail-section-title">Opmerkingen</h3>
      <p>${opmerkingen ? opmerkingen.replace(/\n/g, "<br>") : "<span class='hint'>Nog geen extra opmerkingen.</span>"}</p>
    </div>

    <div>
      <h3 class="detail-section-title">Bijdragen</h3>
      <div class="detail-actions">
        ${renderActionButtons(robot)}
      </div>
    </div>
  `;

  panel.classList.remove("hidden");
}

function renderActionButtons(robot) {
  const robotName = encodeURIComponent(robot.robot || "");
  const merk = encodeURIComponent(robot.merk || "");
  const baseIssueUrl = `https://github.com/${REPO}/issues/new`;

  function issueLink(title, body, labels) {
    const params = new URLSearchParams();
    params.set("title", title);
    if (body) params.set("body", body);
    if (labels) params.set("labels", labels);
    return `${baseIssueUrl}?${params.toString()}`;
  }

  const robotRef = `Robot: ${decodeURIComponent(robotName)} (merk: ${decodeURIComponent(
    merk
  )})`;

  const bodyBase = `${robotRef}\n\nGeef hieronder je voorstel voor aanpassing in JSON-formaat of als beschrijving:\n\n`;

  const btns = [
    {
      icon: "✏️",
      label: "Robot aanpassen",
      title: `Aanpassing ${decodeURIComponent(robotName)}`,
      body: bodyBase,
      labels: "aanpassing",
    },
    {
      icon: "💰",
      label: "Prijsupdate",
      title: `Prijsupdate ${decodeURIComponent(robotName)}`,
      body: `${robotRef}\n\nNieuwe prijs: ...`,
      labels: "prijsupdate",
    },
    {
      icon: "🎥",
      label: "Video toevoegen",
      title: `Nieuwe video: ${decodeURIComponent(robotName)}`,
      body: `${robotRef}\n\nVideo label: ...\nVideo URL: ...`,
      labels: "video",
    },
    {
      icon: "📄",
      label: "Artikel toevoegen",
      title: `Nieuw artikel: ${decodeURIComponent(robotName)}`,
      body: `${robotRef}\n\nArtikel titel: ...\nArtikel URL: ...`,
      labels: "artikel",
    },
    {
      icon: "💬",
      label: "Opmerking toevoegen",
      title: `Opmerking bij ${decodeURIComponent(robotName)}`,
      body: `${robotRef}\n\nOpmerking: ...`,
      labels: "opmerking",
    },
  ];

  return btns
    .map((b) => {
      const url = issueLink(b.title, b.body, b.labels);
      return `<a class="action-btn" href="${url}" target="_blank" rel="noopener noreferrer"><span>${b.icon}</span><span>${b.label}</span></a>`;
    })
    .join("");
}

/* ---------- Modal nieuwe robot ---------- */

function initModal() {
  const btnOpen = document.getElementById("btn-new-robot");
  const modal = document.getElementById("new-robot-modal");
  const backdrop = document.getElementById("modal-backdrop");
  const btnClose = document.getElementById("modal-close");
  const form = document.getElementById("new-robot-form");
  const jsonPreview = document.getElementById("json-preview-block");

  function openModal() {
    modal.classList.remove("hidden");
    backdrop.classList.remove("hidden");
  }
  function closeModal() {
    modal.classList.add("hidden");
    backdrop.classList.add("hidden");
  }

  if (btnOpen) btnOpen.addEventListener("click", openModal);
  if (btnClose) btnClose.addEventListener("click", closeModal);
  if (backdrop) backdrop.addEventListener("click", closeModal);

  if (form) {
    form.addEventListener("input", () => {
      const data = formToRobot(form);
      const jsonStr = JSON.stringify(data, null, 2);
      jsonPreview.textContent = jsonStr;
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = formToRobot(form);
      const jsonStr = JSON.stringify(data, null, 2);

      jsonPreview.textContent = jsonStr;

      const title = `Nieuwe robot: ${data.merk} ${data.robot}`;
      const body =
        `Voorstel nieuwe robot voor de catalogus.\n\n` +
        `Gelieve onderstaande JSON toe te voegen aan data/robots.json (denk aan een komma indien nodig):\n\n` +
        "```json\n" +
        jsonStr.replace(/`/g, "\`") +
        "\n```";

      const params = new URLSearchParams();
      params.set("title", title);
      params.set("body", body);
      params.set("labels", "nieuwe-robot");

      const url = `https://github.com/${REPO}/issues/new?${params.toString()}`;
      window.open(url, "_blank", "noopener");

      closeModal();
      form.reset();
    });
  }
}

function formToRobot(form) {
  const fd = new FormData(form);
  const merk = (fd.get("merk") || "").toString().trim();
  const robot = (fd.get("robot") || "").toString().trim();
  const gewassenStr = (fd.get("gewassen") || "").toString();
  const handStr = (fd.get("handelingen") || "").toString();
  const ontwikkeling = (fd.get("ontwikkeling") || "").toString().trim();
  const kostprijs = (fd.get("kostprijs") || "").toString().trim();
  const foto = (fd.get("foto") || "").toString().trim();
  const opmerkingen = (fd.get("opmerkingen") || "").toString().trim();
  const linksStr = (fd.get("links") || "").toString();

  const gewassen = gewassenStr
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const handelingen = handStr
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const links = linksStr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|");
      return {
        label: (parts[0] || "").trim(),
        url: (parts[1] || "").trim(),
      };
    })
    .filter((l) => l.url);

  return {
    merk,
    robot,
    gewassen,
    handelingen,
    ontwikkeling,
    kostprijs,
    foto,
    links,
    opmerkingen,
  };
}
