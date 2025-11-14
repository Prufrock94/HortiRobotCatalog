
async function loadRobots() {
  const res = await fetch("data/robots.json");
  const robots = await res.json();
  renderTable(robots);
}

function devIcon(stage){
  const map = {
    "onderzoek":"🔬",
    "prototype":"🧪",
    "start-up":"🚀",
    "scale-up":"📈",
    "commercieel":"🛒"
  };
  return `<span class="icon-dev" title="${stage}">${map[stage]||"❓"}</span>`;
}

function chip(text){
  const map = {
    "wieden":"chip-blue","scouten":"chip-purple","zaaien":"chip-orange",
    "oogsten":"chip-green","bieten":"chip-red","spinazie":"chip-green",
    "sla":"chip-green","prei":"chip-green","wortel":"chip-orange"
  };
  const cls = map[text.toLowerCase()] || "chip-gray";
  return `<span class="chip ${cls}">${text}</span>`;
}

function renderTable(data){
  let html = `<table><thead><tr>
    <th>Merk</th><th>Robot</th><th>Gewassen</th>
    <th>Handelingen</th><th>Ontwikkeling</th><th>Kostprijs</th>
  </tr></thead><tbody>`;

  data.forEach((r,i)=>{
    html+=`<tr data-index="${i}">
      <td>${r.merk}</td>
      <td>${r.robot}</td>
      <td>${r.gewassen.map(chip).join("")}</td>
      <td>${r.handelingen.map(chip).join("")}</td>
      <td>${devIcon(r.ontwikkeling)}</td>
      <td>${r.kostprijs}</td>
    </tr>`;
  });
  html+=`</tbody></table>`;
  document.getElementById("table-container").innerHTML=html;

  document.querySelectorAll("tbody tr").forEach(tr=>{
    tr.addEventListener("click",()=>showDetail(data[tr.dataset.index]));
  });
}

function showDetail(r){
  document.getElementById("detail-title").textContent=r.robot;
  document.getElementById("detail-meta").textContent=`${r.merk} – ${r.kostprijs}`;

  const ul=document.getElementById("detail-links");
  ul.innerHTML="";
  r.links.forEach(l=>{
    const li=document.createElement("li");
    li.innerHTML=`<a href="${l.url}" target="_blank">${l.label}</a>`;
    ul.appendChild(li);
  });

  const repo="Prufrock94/HortiRobotCatalog";
  document.getElementById("btn-edit").href=`https://github.com/${repo}/issues/new?title=Aanpassing+${r.robot}&body=Vul+hier+je+wijzigingen+in.`;
  document.getElementById("btn-price").href=`https://github.com/${repo}/issues/new?title=Prijsupdate+${r.robot}&body=Nieuwe+prijs:+...`;
  document.getElementById("btn-video").href=`https://github.com/${repo}/issues/new?title=Video+voor+${r.robot}&body=Video+URL:+...`;
  document.getElementById("btn-article").href=`https://github.com/${repo}/issues/new?title=Artikel+voor+${r.robot}&body=Artikel+URL:+...`;
  document.getElementById("btn-comment").href=`https://github.com/${repo}/issues/new?title=Opmerking+bij+${r.robot}&body=Opmerking:+...`;

  document.getElementById("detail-panel").classList.remove("hidden");
}

loadRobots();
