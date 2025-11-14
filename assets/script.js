// assets/script.js

const REPO = "Prufrock94/HortiRobotCatalog";

let robots = [];
let filtered = [];
let currentSort = { key: "merk", dir: "asc" };
let activeIndex = -1;

// -------------------- INIT --------------------

document.addEventListener("DOMContentLoaded", () => {
  loadRobots();
  setupModal();
});

// -------------------- DATA LADEN --------------------

async function loadRobots() {
  try {
    const res = await fetch("data/robots.json", { cache: "no-store" });
    robots = await res.json();
    filtered = [...robots];

    initFilters();
    applyFilters(); // dit rendert tabel + result count
  } catch (e) {
    console.error("Kon robots.json niet laden:", e);
    const container = document.getElementById("table-container");
    if (container) {
      container.innerHTML =
        "<p style='padding:0.75rem;'>Kon robots.json niet laden. Controleer het pad en de JSON-structuur.</p>";
    }
  }
}

// -------------------- FILTERS --------------------

function initFilters() {
  const merkSelect = document.getElementById("filter-merk");
  const gewasSelect = document.getElementById("filter-gewassen");
  const handelingSelect = document.getElementById("filter-handelingen");
  const ontwikkelSelect = document.getElementById("filter-ontwikkeling");

  const merken = new Set();
  const gewassen = new Set();
  const handelingen = new Set();
  const fases = new Set();

  robots.forEach((r) => {
    if (r.merk) merken.add(r.merk);

    if (Array.isArray(r.gewassen)) {
      r.gewassen.forEach((g) => {
        if (g) gewassen.add(g);
      });
    }

    if (Array.isArray(r.handelingen)) {
      r.handelingen.forEach((h) => {
        if (h) handelingen.add(h);
      });
    }

    if (r.ontwikkeling) fases.add(r.ontwikkeling);
  });

  function fillSelect(select, values) {
    if (!select) return;
    const first = select.querySelector("option[value='']");
    select.innerHTML = "";
    if (first) select.appendChild(first);
    Array.from(values)
      .sort((a, b) => a.localeCompare(b, "nl"))
      .forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
      });
  }

  fillSelect(merkSelect, merken);
  fillSelect(gewasSelect, gewassen);
  fillSelect(handelingSelect, handelingen);
  fillSelect(ontwikkelSelect, fases);

  attachFilterListeners();
}

function attachFilterListeners() {
  const searchInput = document.getElementById("search-input");
  const merkSelect = document.getElementById("filter-merk");
  const gewasSelect = document.getElementById("filter-gewassen");
  const handelingSelect = document.getElementById("filter-handelingen");
  const ontwikkelSelect = document.getElementById("filter-ontwikkeling");

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }
  if (merkSelect) {
    merkSelect.addEventListener("change", applyFilters);
  }
  if (gewasSelect) {
    gewasSelect.addEventListener("change", applyFilters);
  }
  if (handelingSelect) {
    handelingSelect.addEventListener("change", applyFilters);
  }
  if (ontwikkelSelect) {
    ontwikkelSelect.addEventListener("change", applyFilters);
  }
}

function applyFilters() {
  const searchInput = document.getElementById("search-input");
  const merkSelect = document.getElementById("filter-merk");
  const gewasSelect = document.getElementById("filter-gewassen");
  const handelingSelect = document.getElementById("filter-handelingen");
  const ontwikkelSelect = document.getElementById("filter-ontwikkeling");

  const zoek = (searchInput?.value || "").toLowerCase().trim();
  const merk = merkSelect?.value || "";
  const gewas = gewasSelect?.value || "";
  const handeling = handelingSelect?.value || "";
  const ontwikkeling = ontwikkelSelect?.value || "";

  filtered = robots.filter((r) => {
    // tekstzoek
    if (zoek) {
      const haystack = [
        r.merk,
        r.robot,
        Array.isArray(r.gewassen) ? r.gewassen.join(", ") : "",
        Array.isArray(r.handelingen) ? r.handelingen.join(", ") : "",
        r.ontwikkeling,
        r.opmerkingen,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(zoek)) return false;
    }

    // merk
    if (merk && r.merk !== merk) return false;

    // gewas
    if (gewas) {
      const list = Array.isArray(r.gewassen) ? r.gewassen.map((g) => g.toString()) : [];
      if (!list.includes(gewas)) return false;
    }

    // handeling
    if (handeling) {
      const list = Array.isArray(r.handelingen) ? r.handelingen.map((h) => h.toString()) : [];
      if (!list.includes(handeling)) return false;
    }

    // ontwikkelingsfase
    if (ontwikkeling && r.ontwikkeling !== ontwikkeling) return false;

    return true;
  });

  sortFiltered();
  renderTable();
  renderResultCount();
}

// -------------------- SORTEREN --------------------

function sortFiltered() {
  if (!currentSort || !currentSort.key) return;
  const { key, dir } = currentSort;

  filtered.sort((a, b) => {
    if (key === "kostprijs") {
      const va = parsePrice(a.kostprijs);
      const vb = parsePrice(b.kostprijs);
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    }

    const va = (a[key] ?? "").toString().toLowerCase();
    const vb = (b[key] ?? "").toString().toLowerCase();
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

function parsePrice(str) {
  if (!str) return Number.MAX_SAFE_INTEGER;
  const m = (str.match(/[\d\.]+/g) || []).join("");
  if (!m) return Number.MAX_SAFE_INTEGER;
  const val = parseFloat(m);
  return isNaN(val) ? Number.MAX_SAFE_INTEGER : val;
}

// -------------------- TABEL RENDEREN --------------------

function renderTable() {
  const container = document.getElementById("table-container");
  if (!container) return;

  if (!filtered.length) {
    container.innerHTML =
      "<div style='padding:0.75rem;'>Geen robots gevonden voor deze filters.</div>";
    const detail = document.getElementById("detail-panel");
    if (detail) detail.classList.add("hidden");
    return;
  }

  let thead = `
    <thead>
      <tr>
        <th></th>
        <th class="sortable" data-sort-key="merk">Merk</th>
        <th class="sortable" data-sort-key="robot">Robot</th>
        <th>Gewassen</th>
        <th>Handelingen</th>
        <th class="sortable" data-sort-key="ontwikkeling">Ontwikkeling</th>
        <th class="sortable" data-sort-key="kostprijs">Kostprijs</th>
      </tr>
    </thead>
  `;

  let tbody = "<tbody>";

  filtered.forEach((r, idx) => {
    const fotoHtml = makeThumb(r);
    const gewasHtml = makeGewasChips(r);
    const handelingHtml = makeHandelingChips(r);
    const ontwikkelingHtml = makeOntwikkelingPill(r);

    const isActive = idx === activeIndex;

    tbody += `
      <tr data-index="${idx}" class="${isActive ? "active" : ""}">
        <td class="cell-thumb">
          <div class="cell-thumb-inner">
            ${fotoHtml}
          </div>
        </td>
        <td>${escapeHtml(r.merk || "")}</td>
        <td>${escapeHtml(r.robot || "")}</td>
        <td>${gewasHtml}</td>
        <td>${handelingHtml}</td>
        <td>${ontwikkelingHtml}</td>
        <td>${escapeHtml(r.kostprijs || "")}</td>
      </tr>
    `;
  });

  tbody += "</tbody>";

  container.innerHTML = `
    <table>
      ${thead}
      ${tbody}
    </table>
  `;

  // sorteerheaders updaten
  const ths = container.querySelectorAll("th.sortable");
  ths.forEach((th) => {
    const key = th.getAttribute("data-sort-key");
    th.classList.remove("sorted-asc", "sorted-desc");
    if (key === currentSort.key) {
      th.classList.add(currentSort.dir === "asc" ? "sorted-asc" : "sorted-desc");
    }
    th.addEventListener("click", () => {
      if (currentSort.key === key) {
        currentSort.dir = currentSort.dir === "asc" ? "desc" : "asc";
      } else {
        currentSort.key = key;
        currentSort.dir = "asc";
      }
      sortFiltered();
      renderTable();
    });
  });

  // rij-clicks
  const rows = container.querySelectorAll("tbody tr");
  rows.forEach((row) => {
    row.addEventListener("click", () => {
      const idx = parseInt(row.getAttribute("data-index") || "-1", 10);
      if (!isNaN(idx)) {
        activeIndex = idx;
        renderTable(); // om active-klasse te vernieuwen
        showDetail(filtered[activeIndex]);
      }
    });
  });

  // als er nog geen selectie is, eerste tonen
  if (activeIndex === -1 && filtered.length > 0) {
    activeIndex = 0;
    showDetail(filtered[0]);
  }
}

function renderResultCount() {
  const el = document.getElementById("result-count");
  if (!el) return;
  const total = robots.length;
  const shown = filtered.length;
  if (!total) {
    el.textContent = "";
    return;
  }
  if (shown === total) {
    el.textContent = `${shown} robots in de catalogus.`;
  } else {
    el.textContent = `${shown} van ${total} robots getoond (na filter).`;
  }
}

// -------------------- DETAILPANEEL --------------------

function showDetail(robot) {
  const panel = document.getElementById("detail-panel");
  if (!panel) return;
  if (!robot) {
    panel.classList.add("hidden");
    return;
  }
  panel.classList.remove("hidden");

  const fotoHtml = makeDetailThumb(robot);
  const gewasHtml = makeGewasChips(robot);
  const handelingHtml = makeHandelingChips(robot);
  const ontwikkelingHtml = makeOntwikkelingPill(robot);
  const linksHtml = makeLinksList(robot);
  const remarks = (robot.opmerkingen || "").trim();

  panel.innerHTML = `
    <div class="detail-header">
      <div class="detail-thumb">
        ${fotoHtml}
      </div>
      <div class="detail-main">
        <h2 class="detail-title">${escapeHtml(robot.robot || "")}</h2>
        <p class="detail-sub">
          ${escapeHtml(robot.merk || "")}
          ${robot.kostprijs ? " · " + escapeHtml(robot.kostprijs) : ""}
        </p>
        <div class="detail-tags">
          ${gewasHtml}
          ${handelingHtml}
        </div>
        <div>${ontwikkelingHtml}</div>
      </div>
    </div>

    <div class="detail-body">
      ${
        linksHtml
          ? `<h3 class="detail-section-title">Links</h3>${linksHtml}`
          : ""
      }
      ${
        remarks
          ? `<h3 class="detail-section-title">Opmerkingen</h3><p style="font-size:0.86rem; margin-top:0.2rem; white-space:pre-wrap;">${escapeHtml(
              remarks
            )}</p>`
          : ""
      }
      <h3 class="detail-section-title">Bijdragen</h3>
      <div class="detail-actions">
        ${renderActionButtons(robot)}
      </div>
    </div>
  `;
}

// -------------------- HULPFUNCTIES – RENDERING --------------------

function makeThumb(robot) {
  if (robot.foto && robot.foto.trim()) {
    return `<img src="${robot.foto}" alt="${escapeHtml(
      robot.robot || robot.merk || "Robot"
    )}" />`;
  }
  return `<span class="cell-thumb-placeholder">Geen foto</span>`;
}

function makeDetailThumb(robot) {
  if (robot.foto && robot.foto.trim()) {
    return `<img src="${robot.foto}" alt="${escapeHtml(
      robot.robot || robot.merk || "Robot"
    )}" />`;
  }
  return `<span class="cell-thumb-placeholder">Geen foto</span>`;
}

function makeGewasChips(robot) {
  if (!Array.isArray(robot.gewassen) || robot.gewassen.length === 0) return "";
  return `<div class="chips-row">
    ${robot.gewassen
      .map((g) => {
        const label = g || "";
        const icon = gewasIcon(label);
        const colorClass = gewasColor(label);
        return `<span class="chip ${colorClass}"><span class="chip-icon">${icon}</span><span>${escapeHtml(
          label
        )}</span></span>`;
      })
      .join("")}
  </div>`;
}

function makeHandelingChips(robot) {
  if (!Array.isArray(robot.handelingen) || robot.handelingen.length === 0)
    return "";
  return `<div class="chips-row">
    ${robot.handelingen
      .map((h) => {
        const label = h || "";
        const icon = handelingIcon(label);
        const colorClass = handelingColor(label);
        return `<span class="chip ${colorClass}"><span class="chip-icon">${icon}</span><span>${escapeHtml(
          label
        )}</span></span>`;
      })
      .join("")}
  </div>`;
}

function makeOntwikkelingPill(robot) {
  const fase = robot.ontwikkeling || "";
  const { icon, color } = ontwikkelingIcon(fase);
  return `
    <span class="dev-pill" title="${escapeHtml(fase || "")}">
      <span class="dev-icon">${icon}</span>
      <span class="dev-label">${escapeHtml(fase || "")}</span>
    </span>
  `;
}

function makeLinksList(robot) {
  if (!Array.isArray(robot.links) || robot.links.length === 0) return "";
  const links = robot.links
    .map((l) => {
      if (!l || !l.url) return "";
      const label = l.label || l.url;
      return `<li><a href="${l.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        label
      )}</a></li>`;
    })
    .join("");
  if (!links) return "";
  return `<ul style="padding-left:1.1rem; margin:0.2rem 0;">${links}</ul>`;
}

// -------------------- ICON HELPERS --------------------

function gewasIcon(label) {
  const l = (label || "").toLowerCase();
  if (l.includes("sla")) return "🥬";
  if (l.includes("prei")) return "🧅";
  if (l.includes("wortel") || l.includes("carrot")) return "🥕";
  if (l.includes("kool") || l.includes("cabbage")) return "🥦";
  if (l.includes("ui")) return "🧅";
  if (l.includes("pompoen") || l.includes("squash") || l.includes("pumpkin"))
    return "🎃";
  return "🌱";
}

function gewasColor(label) {
  const l = (label || "").toLowerCase();
  if (l.includes("sla") || l.includes("leaf")) return "chip-green";
  if (l.includes("prei") || l.includes("ui")) return "chip-amber";
  if (l.includes("wortel") || l.includes("carrot")) return "chip-orange";
  if (l.includes("kool") || l.includes("cabbage")) return "chip-purple";
  if (l.includes("pompoen") || l.includes("squash")) return "chip-blue";
  return "chip-gray";
}

function handelingIcon(label) {
  const l = (label || "").toLowerCase();
  if (l.includes("wied") || l.includes("onkruid")) return "🧹";
  if (l.includes("zaai") || l.includes("planten")) return "🌱";
  if (l.includes("oogst") || l.includes("harvest")) return "🧺";
  if (l.includes("spuit") || l.includes("spray")) return "💨";
  if (l.includes("scan") || l.includes("scout") || l.includes("monitor"))
    return "🎯";
  if (l.includes("spuit") || l.includes("spray")) return "💨";
  return "⚙️";
}

function handelingColor(label) {
  const l = (label || "").toLowerCase();
  if (l.includes("wied") || l.includes("onkruid")) return "chip-green";
  if (l.includes("zaai") || l.includes("planten")) return "chip-blue";
  if (l.includes("oogst") || l.includes("harvest")) return "chip-orange";
  if (l.includes("spuit") || l.includes("spray")) return "chip-red";
  if (l.includes("scan") || l.includes("scout") || l.includes("monitor"))
    return "chip-purple";
  return "chip-gray";
}

function ontwikkelingIcon(fase) {
  const l = (fase || "").toLowerCase();
  if (l.includes("onderzoek")) return { icon: "🔬", color: "chip-blue" };
  if (l.includes("prototype")) return { icon: "🧪", color: "chip-amber" };
  if (l.includes("start-up") || l.includes("startup"))
    return { icon: "🚀", color: "chip-green" };
  if (l.includes("scale")) return { icon: "📈", color: "chip-purple" };
  if (l.includes("commerc")) return { icon: "🛒", color: "chip-blue" };
  return { icon: "⚙️", color: "chip-gray" };
}

// -------------------- GITHUB ISSUE KNOPPEN PER ROBOT --------------------

function robotToJSON(robot) {
  const obj = {
    merk: robot.merk || "",
    robot: robot.robot || "",
    gewassen: Array.isArray(robot.gewassen) ? robot.gewassen : [],
    handelingen: Array.isArray(robot.handelingen) ? robot.handelingen : [],
    ontwikkeling: robot.ontwikkeling || "",
    kostprijs: robot.kostprijs || "",
    foto: robot.foto || "",
    links: Array.isArray(robot.links) ? robot.links : [],
    opmerkingen: robot.opmerkingen || "",
  };
  return JSON.stringify(obj, null, 2);
}

function renderActionButtons(robot) {
  const robotName = robot.robot || "";
  const merkName = robot.merk || "";
  const baseIssueUrl = `https://github.com/${REPO}/issues/new`;

  function issueLink(title, body, labels) {
    const params = new URLSearchParams();
    params.set("title", title);
    if (body) params.set("body", body);
    if (labels) params.set("labels", labels);
    return `${baseIssueUrl}?${params.toString()}`;
  }

  const robotRef = `Robot: ${robotName} (merk: ${merkName})`;
  const jsonStr = robotToJSON(robot);
  const escapedJson = jsonStr.replace(/`/g, "\\`");

  const bodyAanpassing =
    `${robotRef}\n\n` +
    `Huidige JSON voor deze robot:\n\n` +
    "```json\n" +
    escapedJson +
    "\n```\n\n" +
    "Beschrijf hieronder je voorgestelde wijzigingen of plak een aangepaste JSON:\n\n";

  const bodyPrijs =
    `${robotRef}\n\n` +
    `Huidige JSON (inclusief huidige kostprijs):\n\n` +
    "```json\n" +
    escapedJson +
    "\n```\n\n" +
    "Nieuwe kostprijs (beschrijf of pas JSON aan):\n\n";

  const bodyVideo =
    `${robotRef}\n\n` +
    `Huidige JSON:\n\n` +
    "```json\n" +
    escapedJson +
    "\n```\n\n" +
    "Nieuwe video toevoegen:\n" +
    "- Label: ...\n" +
    "- URL: ...\n\n" +
    "Je mag ook direct een aangepaste JSON voorstellen met de extra link in het 'links'-veld.\n";

  const bodyArtikel =
    `${robotRef}\n\n` +
    `Huidige JSON:\n\n` +
    "```json\n" +
    escapedJson +
    "\n```\n\n" +
    "Nieuw artikel toevoegen:\n" +
    "- Titel/label: ...\n" +
    "- URL: ...\n\n" +
    "Je mag ook direct een aangepaste JSON voorstellen met de extra link in het 'links'-veld.\n";

  const bodyOpmerking =
    `${robotRef}\n\n` +
    `Huidige JSON (context):\n\n` +
    "```json\n" +
    escapedJson +
    "\n```\n\n" +
    "Opmerking:\n\n";

  const btns = [
    {
      icon: "✏️",
      label: "Robot aanpassen",
      title: `Aanpassing ${robotName}`,
      body: bodyAanpassing,
      labels: "aanpassing",
    },
    {
      icon: "💰",
      label: "Prijsupdate",
      title: `Prijsupdate ${robotName}`,
      body: bodyPrijs,
      labels: "prijsupdate",
    },
    {
      icon: "🎥",
      label: "Video toevoegen",
      title: `Nieuwe video: ${robotName}`,
      body: bodyVideo,
      labels: "video",
    },
    {
      icon: "📄",
      label: "Artikel toevoegen",
      title: `Nieuw artikel: ${robotName}`,
      body: bodyArtikel,
      labels: "artikel",
    },
    {
      icon: "💬",
      label: "Opmerking toevoegen",
      title: `Opmerking bij ${robotName}`,
      body: bodyOpmerking,
      labels: "opmerking",
    },
  ];

  return btns
    .map((b) => {
      const url = issueLink(b.title, b.body, b.labels);
      return `
        <a class="action-btn"
           href="${url}"
           target="_blank"
           rel="noopener noreferrer">
          <span>${b.icon}</span>
          <span>${b.label}</span>
        </a>`;
    })
    .join("");
}

// -------------------- MODAL "NIEUWE ROBOT" --------------------

function setupModal() {
  const backdrop = document.getElementById("modal-backdrop");
  const modal = document.getElementById("new-robot-modal");
  const openBtn = document.getElementById("btn-new-robot");
  const closeBtn = document.getElementById("modal-close");
  const form = document.getElementById("new-robot-form");
  const jsonPreview = document.getElementById("json-preview-block");

  if (!backdrop || !modal || !openBtn || !closeBtn || !form || !jsonPreview)
    return;

  function openModal() {
    backdrop.classList.remove("hidden");
    modal.classList.remove("hidden");
    updateJsonPreview(); // eerste versie
  }

  function closeModal() {
    backdrop.classList.add("hidden");
    modal.classList.add("hidden");
  }

  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });

  function getFormData() {
    const data = new FormData(form);
    const merk = (data.get("merk") || "").toString().trim();
    const robotName = (data.get("robot") || "").toString().trim();
    const gewassenRaw = (data.get("gewassen") || "").toString().trim();
    const handelingenRaw = (data.get("handelingen") || "").toString().trim();
    const ontwikkeling = (data.get("ontwikkeling") || "").toString().trim();
    const kostprijs = (data.get("kostprijs") || "").toString().trim();
    const foto = (data.get("foto") || "").toString().trim();
    const opmerkingen = (data.get("opmerkingen") || "").toString().trim();
    const linksRaw = (data.get("links") || "").toString().trim();

    const gewassen = gewassenRaw
      ? gewassenRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const handelingen = handelingenRaw
      ? handelingenRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const links = [];
    if (linksRaw) {
      linksRaw.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const [label, url] = trimmed.split("|").map((s) => s.trim());
        if (url) {
          links.push({
            label: label || url,
            url,
          });
        }
      });
    }

    return {
      merk,
      robot: robotName,
      gewassen,
      handelingen,
      ontwikkeling,
      kostprijs,
      foto,
      opmerkingen,
      links,
    };
  }

  function updateJsonPreview() {
    const obj = getFormData();
    jsonPreview.textContent = JSON.stringify(obj, null, 2);
  }

  // live update JSON-preview
  form.addEventListener("input", updateJsonPreview);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const obj = getFormData();

    const title = `Nieuwe robot: ${obj.merk || ""} ${obj.robot || ""}`.trim();
    const body =
      `Nieuwe robotvoorstel voor de HortiRobot Catalog:\n\n` +
      "```json\n" +
      JSON.stringify(obj, null, 2) +
      "\n```\n\n" +
      "Gelieve deze JSON, na controle, toe te voegen aan `data/robots.json` in de repository.\n";

    const params = new URLSearchParams();
    params.set("title", title || "Nieuwe robot");
    params.set("body", body);
    params.set("labels", "nieuwe-robot");

    const url = `https://github.com/${REPO}/issues/new?${params.toString()}`;
    window.open(url, "_blank", "noopener");

    // modal open laten zodat iemand eventueel nog kan tweaken,
    // of sluit 'm als je dat logischer vindt:
    // closeModal();
  });
}

// -------------------- UTIL --------------------

function escapeHtml(str) {
  return (str || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
