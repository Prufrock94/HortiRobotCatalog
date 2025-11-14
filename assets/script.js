
async function load(){
  const data = await (await fetch('data/robots.json')).json();
  window.robots=data;
  renderFilters(data);
  renderTable(data);
}

function chip(text){
  const map={
    'wieden':'chip-blue','scouten':'chip-purple','zaaien':'chip-orange',
    'oogsten':'chip-green','sla':'chip-green','prei':'chip-green',
    'wortel':'chip-orange','bieten':'chip-red','spinazie':'chip-green'
  };
  let cls=map[text.toLowerCase()]||'chip-gray';
  return `<span class="chip ${cls}">${text}</span>`;
}

function devIcon(stage){
  const map={
    'onderzoek':'🔬','prototype':'🧪','start-up':'🚀',
    'scale-up':'📈','commercieel':'🛒'
  };
  return `<span class='icon-dev' title='${stage}'>${map[stage]||'❓'}</span>`;
}

function renderFilters(data){
  let html=`<select id='filter-merk'><option value=''>Merk</option>`;
  [...new Set(data.map(r=>r.merk))].forEach(m=>html+=`<option>${m}</option>`);
  html+=`</select>`;
  document.getElementById('filters').innerHTML=html;
  document.getElementById('filter-merk').addEventListener('change',applyFilters);
}

function applyFilters(){
  let merk=document.getElementById('filter-merk').value;
  let filtered=window.robots.filter(r=>!merk||r.merk===merk);
  renderTable(filtered);
}

function renderTable(data){
  let html=`<table><thead><tr>
    <th>Merk</th><th>Robot</th><th>Gewassen</th>
    <th>Handelingen</th><th>Ontwikkeling</th><th>Kostprijs</th>
  </tr></thead><tbody>`;

  data.forEach((r,i)=>{
    html+=`<tr data-i='${i}'><td>${r.merk}</td>
    <td>${r.robot}</td>
    <td>${r.gewassen.map(chip).join('')}</td>
    <td>${r.handelingen.map(chip).join('')}</td>
    <td>${devIcon(r.ontwikkeling)}</td>
    <td>${r.kostprijs}</td></tr>`;
  });

  html+=`</tbody></table>`;
  document.getElementById('table-container').innerHTML=html;

  document.querySelectorAll('#table-container tbody tr').forEach(tr=>{
    tr.addEventListener('click',()=>showDetail(data[tr.dataset.i]));
  });
}

function showDetail(r){
  let html=`<h2>${r.robot}</h2>
  <p>${r.merk} – ${r.kostprijs}</p>
  <h3>Links</h3><ul>`;
  r.links.forEach(l=>{
    html+=`<li><a href='${l.url}' target='_blank'>${l.label}</a></li>`;
  });
  html+=`</ul>
  <h3>Bijdragen</h3>
  <a class='action-btn' target='_blank'
     href='https://github.com/Prufrock94/HortiRobotCatalog/issues/new?title=Aanpassing+${r.robot}'>✏️ Robot aanpassen</a>
  <a class='action-btn' target='_blank'
     href='https://github.com/Prufrock94/HortiRobotCatalog/issues/new?title=Prijsupdate+${r.robot}'>💰 Prijsupdate</a>
  <a class='action-btn' target='_blank'
     href='https://github.com/Prufrock94/HortiRobotCatalog/issues/new?title=Video+voor+${r.robot}'>🎥 Video toevoegen</a>
  <a class='action-btn' target='_blank'
     href='https://github.com/Prufrock94/HortiRobotCatalog/issues/new?title=Artikel+voor+${r.robot}'>📄 Artikel toevoegen</a>
  <a class='action-btn' target='_blank'
     href='https://github.com/Prufrock94/HortiRobotCatalog/issues/new?title=Opmerking+bij+${r.robot}'>💬 Opmerking</a>
  `;
  const panel=document.getElementById('detail-panel');
  panel.innerHTML=html;
  panel.classList.remove('hidden');
}

load();
