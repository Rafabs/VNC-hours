/* ============================================================
   Editor de Traçado - VNC (multi-linha, semáforos, paradas, edição)
   ============================================================ */

const OSRM_BASE = 'https://router.project-osrm.org';
const CORES = { ida: '#2ecc71', volta: '#3498db' };

const state = {
  linhas: [],
  linhaIdx: -1,
  sentidoAtual: 'ida',
  modo: 'desenho',         // 'desenho' | 'semaforo' | 'parada' | 'editar'
  pendenteOrigem: null,
  selecionado: null,
  trechoEmEdicao: null,
  handles: [],
};

let map;
const layers = new Map();          // `${linhaIdx}-${sentido}-${id}` -> { poly, trecho, sentido }
let marcadoresPendentes = [];
const semaforoMarkers = new Map();
const paradaMarkers    = new Map();

/* ---------- Init ---------- */
function initMap() {
  map = L.map('map').setView([-23.5505, -46.6333], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19,
  }).addTo(map);
  map.on('click', onMapClick);
}

/* ---------- Linha atual ---------- */
function linhaAtual() {
  return state.linhaIdx >= 0 ? state.linhas[state.linhaIdx] : null;
}
function listaTrechos()   { const l = linhaAtual(); return l ? l[state.sentidoAtual].trechos   : []; }
function listaSemaforos() { const l = linhaAtual(); return l ? l[state.sentidoAtual].semaforos : []; }
function listaParadas()   { const l = linhaAtual(); return l ? l[state.sentidoAtual].paradas   : []; }

/* ---------- Clique no mapa ---------- */
async function onMapClick(e) {
  if (!linhaAtual()) { showToast('Crie ou selecione uma linha primeiro'); return; }

  if (state.modo === 'semaforo') return criarSemaforoPorClique(e.latlng);
  if (state.modo === 'parada')   return criarParadaPorClique(e.latlng);
  if (state.modo === 'editar')   return;

  const { lat, lng } = e.latlng;
  if (!state.pendenteOrigem) {
    state.pendenteOrigem = { lat, lng };
    marcadoresPendentes.push(marcadorClique(e.latlng));
    setDrawMode('aguardando 2º clique');
    return;
  }

  const origem = state.pendenteOrigem;
  const destino = { lat, lng };
  state.pendenteOrigem = null;
  marcadoresPendentes.push(marcadorClique(e.latlng));
  setDrawMode('aguardando 1º clique');

  showToast('Consultando OSRM…');
  try {
    const rota = await consultarOSRM(origem, destino);
    if (!rota) { showToast('OSRM sem rota'); limparPendentes(); return; }

    const lista = listaTrechos();
    const id = `tr-${state.sentidoAtual}-${String(lista.length + 1).padStart(3, '0')}`;
    const velocidade = parseFloat(prompt('Velocidade do trecho (km/h):', '40')) || 40;

    lista.push({
      id, ordem: lista.length + 1, nome: `Trecho ${lista.length + 1}`,
      velocidade_kmh: velocidade,
      pontos_origem: [origem, destino],
      geometria: rota.geometria,
      distancia_m: rota.distancia_m,
      duracao_estimada_s: rota.distancia_m / (velocidade / 3.6),
    });

    redesenharTudo();
    limparPendentes();
    renderLista();
    showToast(`Trecho ${id} criado`);
  } catch (err) {
    console.error(err);
    showToast('Erro OSRM: ' + err.message);
    limparPendentes();
  }
}

function marcadorClique(latlng) {
  return L.circleMarker(latlng, {
    radius: 6, color: '#fff', weight: 2,
    fillColor: CORES[state.sentidoAtual], fillOpacity: 1,
  }).addTo(map);
}
function limparPendentes() {
  marcadoresPendentes.forEach(m => map.removeLayer(m));
  marcadoresPendentes = [];
}

/* ---------- OSRM ---------- */
async function consultarOSRM(a, b) {
  const url = `${OSRM_BASE}/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const data = await resp.json();
  if (!data.routes?.length) return null;
  const r = data.routes[0];
  return {
    geometria: r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distancia_m: r.distance,
  };
}

/* ---------- Layers ---------- */
function chaveLayer(sentido, id) { return `${state.linhaIdx}-${sentido}-${id}`; }

function corDaVelocidade(kmh, sentido) {
  if (kmh < 20) return '#e74c3c';
  if (kmh < 40) return '#f39c12';
  if (kmh < 60) return CORES[sentido];
  return '#27ae60';
}

function redesenharTudo() {
  layers.forEach(v => map.removeLayer(v.poly));
  layers.clear();
  semaforoMarkers.forEach(m => map.removeLayer(m));
  semaforoMarkers.clear();
  paradaMarkers.forEach(m => map.removeLayer(m));
  paradaMarkers.clear();

  if (!linhaAtual()) return;

  ['ida', 'volta'].forEach(sentido => {
    // trechos
    linhaAtual()[sentido].trechos.forEach(t => {
      const latlngs = t.geometria.map(p => [p.lat, p.lng]);
      const poly = L.polyline(latlngs, {
        color: corDaVelocidade(t.velocidade_kmh, sentido),
        weight: 6, opacity: sentido === 'ida' ? .85 : .7,
        dashArray: sentido === 'volta' ? '8,6' : null,
      }).addTo(map);
      poly.on('click', ev => { L.DomEvent.stopPropagation(ev); selecionarTrecho(t.id, sentido); });
      poly.bindTooltip(
        `${sentido.toUpperCase()} • ${t.nome} • ${t.velocidade_kmh} km/h`,
        { sticky: true }
      );
      layers.set(chaveLayer(sentido, t.id), { poly, trecho: t, sentido });
    });

    // semáforos
    (linhaAtual()[sentido].semaforos || []).forEach(s => {
      const icon = L.divIcon({
        className: '', html: `<div class="semaforo-marker">🚦</div>`,
        iconSize: [26,26], iconAnchor: [13,13],
      });
      const m = L.marker([s.lat, s.lng], { icon }).addTo(map);
      m.bindTooltip(`Semáforo • ${s.tempo_parada_s}s`, { sticky: true });
      m.on('click', ev => {
        L.DomEvent.stopPropagation(ev);
        const t = prompt('Tempo de parada (s):', s.tempo_parada_s);
        if (t != null && !isNaN(+t)) {
          s.tempo_parada_s = Math.max(1, +t);
          renderLista();
          m.setTooltipContent(`Semáforo • ${s.tempo_parada_s}s`);
        }
      });
      semaforoMarkers.set(`${state.linhaIdx}-${sentido}-${s.id}`, m);
    });

    // paradas
    (linhaAtual()[sentido].paradas || []).forEach(p => {
      const icon = L.divIcon({
        className: '', html: `<div class="parada-marker">🚏</div>`,
        iconSize: [26,26], iconAnchor: [13,13],
      });
      const m = L.marker([p.lat, p.lng], { icon }).addTo(map);
      m.bindTooltip(`Parada • ${p.tempo_parada_s}s`, { sticky: true });
      m.on('click', ev => {
        L.DomEvent.stopPropagation(ev);
        const t = prompt('Tempo de parada (s):', p.tempo_parada_s);
        if (t != null && !isNaN(+t)) {
          p.tempo_parada_s = Math.max(1, +t);
          renderLista();
          m.setTooltipContent(`Parada • ${p.tempo_parada_s}s`);
        }
      });
      paradaMarkers.set(`${state.linhaIdx}-${sentido}-${p.id}`, m);
    });
  });
}

function selecionarTrecho(id, sentido) {
  state.selecionado = id;
  const entry = layers.get(chaveLayer(sentido, id));
  if (entry) {
    map.fitBounds(entry.poly.getBounds(), { padding: [60, 60] });
    entry.poly.openTooltip();
  }
  renderLista();
}

/* ---------- Modo semáforo ---------- */
function criarSemaforoPorClique(latlng) {
  const lista = listaTrechos();
  if (!lista.length) { showToast('Crie um trecho antes'); return; }

  let melhor = null, melhorDist = Infinity, melhorFracao = 0;
  lista.forEach(t => {
    const r = projetarNoTrecho(latlng, t.geometria);
    if (r.dist < melhorDist) { melhorDist = r.dist; melhor = t; melhorFracao = r.fracao; }
  });
  if (!melhor || melhorDist > 80) { showToast('Clique mais perto do traçado'); return; }

  const tempo = parseFloat(prompt('Tempo de parada do semáforo (s):', '30')) || 30;
  const sem = {
    id: `sf-${state.sentidoAtual}-${String(listaSemaforos().length + 1).padStart(3,'0')}`,
    lat: latlng.lat, lng: latlng.lng,
    tempo_parada_s: Math.max(1, tempo),
    trecho_id: melhor.id,
    fracao: melhorFracao,
  };
  listaSemaforos().push(sem);
  redesenharTudo();
  renderLista();
  showToast(`Semáforo criado (${sem.tempo_parada_s}s)`);
}

/* ---------- Modo parada ---------- */
function criarParadaPorClique(latlng) {
  const lista = listaTrechos();
  if (!lista.length) { showToast('Crie um trecho antes'); return; }

  let melhor = null, melhorDist = Infinity, melhorFracao = 0;
  lista.forEach(t => {
    const r = projetarNoTrecho(latlng, t.geometria);
    if (r.dist < melhorDist) { melhorDist = r.dist; melhor = t; melhorFracao = r.fracao; }
  });
  if (!melhor || melhorDist > 80) { showToast('Clique mais perto do traçado'); return; }

  const tempo = parseFloat(prompt('Tempo de parada na parada (s):', '20')) || 20;
  const par = {
    id: `pa-${state.sentidoAtual}-${String(listaParadas().length + 1).padStart(3,'0')}`,
    lat: latlng.lat, lng: latlng.lng,
    tempo_parada_s: Math.max(1, tempo),
    trecho_id: melhor.id,
    fracao: melhorFracao,
  };
  listaParadas().push(par);
  redesenharTudo();
  renderLista();
  showToast(`Parada criada (${par.tempo_parada_s}s)`);
}

/* ---------- Projeção de ponto na polilinha ---------- */
function projetarNoTrecho(pt, geom) {
  let best = { dist: Infinity, fracao: 0 };
  const dists = [0];
  for (let i = 1; i < geom.length; i++)
    dists.push(dists[i-1] + haversineMetros(geom[i-1], geom[i]));
  const total = dists[dists.length-1];
  for (let i = 1; i < geom.length; i++) {
    const a = geom[i-1], b = geom[i];
    const seg = dists[i] - dists[i-1];
    if (seg === 0) continue;
    const t = clamp(projecaoLinear(pt, a, b), 0, 1);
    const proj = { lat: a.lat + (b.lat-a.lat)*t, lng: a.lng + (b.lng-a.lng)*t };
    const d = haversineMetros(pt, proj);
    if (d < best.dist) best = { dist: d, fracao: (dists[i-1] + seg*t) / total };
  }
  return best;
}
function projecaoLinear(p, a, b) {
  const dx = b.lng - a.lng, dy = b.lat - a.lat;
  if (dx === 0 && dy === 0) return 0;
  return ((p.lng - a.lng)*dx + (p.lat - a.lat)*dy) / (dx*dx + dy*dy);
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* ---------- Modo editar vértices ---------- */
function ativarModoEditar(trechoId) {
  desativarEdicao();
  const sentido = state.sentidoAtual;
  const entry = layers.get(chaveLayer(sentido, trechoId));
  if (!entry) return;

  state.trechoEmEdicao = trechoId;
  const t = entry.trecho;

  t.pontos_origem.forEach((p, idx) => {
    const h = L.marker([p.lat, p.lng], {
      draggable: true,
      icon: L.divIcon({ className:'', html:'<div class="vertice-handle"></div>', iconSize:[14,14], iconAnchor:[7,7] }),
    }).addTo(map);
    h.on('dragend', () => rerotearTrecho(trechoId, idx, h.getLatLng()));
    state.handles.push(h);
  });
  showToast(`Editando vértices do ${t.nome}. Arraste e solte.`);
}
function desativarEdicao() {
  state.handles.forEach(h => map.removeLayer(h));
  state.handles = [];
  state.trechoEmEdicao = null;
}

async function rerotearTrecho(trechoId, idx, novoLatLng) {
  const entry = layers.get(chaveLayer(state.sentidoAtual, trechoId));
  if (!entry) return;
  const t = entry.trecho;
  const origem = t.pontos_origem;
  origem[idx] = { lat: novoLatLng.lat, lng: novoLatLng.lng };

  showToast('Recalculando com OSRM…');
  try {
    let geomFinal = [];
    for (let i = 1; i < origem.length; i++) {
      const rota = await consultarOSRM(origem[i-1], origem[i]);
      if (!rota) throw new Error('OSRM sem rota');
      if (i === 1) geomFinal = rota.geometria;
      else geomFinal = geomFinal.concat(rota.geometria.slice(1));
    }
    t.geometria = geomFinal;
    let dist = 0;
    for (let i = 1; i < geomFinal.length; i++) dist += haversineMetros(geomFinal[i-1], geomFinal[i]);
    t.distancia_m = dist;
    t.duracao_estimada_s = dist / (t.velocidade_kmh / 3.6);

    redesenharTudo();
    ativarModoEditar(trechoId);
    renderLista();
    showToast('Traçado atualizado');
  } catch (err) {
    showToast('Erro OSRM: ' + err.message);
  }
}

/* ---------- Painel ---------- */
window.mudarSentido = (sentido) => {
  if (sentido !== 'ida' && sentido !== 'volta') return;
  desativarEdicao();
  state.sentidoAtual = sentido;
  state.selecionado = null;
  redesenharTudo();
  renderLista();
};

function renderLista() {
  const el = document.getElementById('segmentsList');
  const l = linhaAtual();

  if (!l) {
    el.innerHTML = `<div class="empty-hint">Crie uma linha para começar.</div>`;
    document.getElementById('segmentCount').textContent = '0';
    return;
  }

  const lista = l[state.sentidoAtual].trechos;
  const sems  = l[state.sentidoAtual].semaforos;
  const pars  = l[state.sentidoAtual].paradas;
  document.getElementById('segmentCount').textContent =
    `${l.ida.trechos.length}/${l.volta.trechos.length} + ${l.ida.semaforos.length}/${l.volta.semaforos.length}🚦 + ${l.ida.paradas.length}/${l.volta.paradas.length}🚏`;

  const tabs = `
    <div class="sentido-tabs">
      <button class="${state.sentidoAtual==='ida'?'active':''}" onclick="mudarSentido('ida')">IDA (${l.ida.trechos.length})</button>
      <button class="${state.sentidoAtual==='volta'?'active':''}" onclick="mudarSentido('volta')">VOLTA (${l.volta.trechos.length})</button>
    </div>`;

  const itensTrechos = lista.length
    ? lista.map(t => `
      <div class="segment-item ${state.selecionado === t.id ? 'selected' : ''}" data-id="${t.id}">
        <div class="seg-top">
          <span class="dot" style="background:${corDaVelocidade(t.velocidade_kmh, state.sentidoAtual)}"></span>
          <span class="seg-order">#${t.ordem}</span>
          <span class="seg-name">${escapar(t.nome)}</span>
          <button class="seg-del" onclick="removerTrecho('${t.id}', event)">🗑️</button>
        </div>
        <div class="seg-inputs">
          <input type="text" value="${escapar(t.nome)}" onchange="renomearTrecho('${t.id}', this.value)" />
          <input type="number" min="1" max="120" value="${t.velocidade_kmh}" onchange="alterarVelocidade('${t.id}', this.value)" />
          <span class="hint-small">km/h</span>
        </div>
        <div class="seg-meta">
          <span>${Math.round(t.distancia_m)} m</span>
          <span>~${Math.round(t.duracao_estimada_s)} s</span>
          <button class="file-btn" style="padding:2px 6px;font-size:.7rem" onclick="ativarModoEditar('${t.id}'); event.stopPropagation();">editar</button>
        </div>
      </div>`).join('')
    : `<div class="empty-hint">Sem trechos em ${state.sentidoAtual}.</div>`;

  const itensSems = sems.length
    ? sems.map(s => `
      <div class="sem-item">
        🚦 ${s.id}
        <input type="number" min="1" value="${s.tempo_parada_s}"
               onchange="alterarTempoSemaforo('${s.id}', this.value)" /> s
        <button class="seg-del" onclick="removerSemaforo('${s.id}', event)">🗑️</button>
      </div>`).join('')
    : '';

  const itensPars = pars.length
    ? pars.map(p => `
      <div class="par-item">
        🚏 ${p.id}
        <input type="number" min="1" value="${p.tempo_parada_s}"
               onchange="alterarTempoParada('${p.id}', this.value)" /> s
        <button class="seg-del" onclick="removerParada('${p.id}', event)">🗑️</button>
      </div>`).join('')
    : '';

  el.innerHTML = tabs + itensTrechos
    + (sems.length ? `<div class="hint-small" style="margin-top:8px">Semáforos:</div>` + itensSems : '')
    + (pars.length ? `<div class="hint-small" style="margin-top:8px">Paradas:</div>` + itensPars : '');

  el.querySelectorAll('.segment-item').forEach(item => {
    item.addEventListener('click', ev => {
      if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'BUTTON') return;
      selecionarTrecho(item.dataset.id, state.sentidoAtual);
    });
  });
}

/* ---------- Edição de campos ---------- */
function acharTrecho(id, sentido = state.sentidoAtual) {
  return (linhaAtual()?.[sentido].trechos || []).find(t => t.id === id);
}

window.renomearTrecho = (id, nome) => {
  const t = acharTrecho(id);
  if (!t || !nome.trim()) return;
  t.nome = nome.trim();
  const entry = layers.get(chaveLayer(state.sentidoAtual, id));
  if (entry) entry.poly.setTooltipContent(
    `${state.sentidoAtual.toUpperCase()} • ${t.nome} • ${t.velocidade_kmh} km/h`);
  renderLista();
};
window.alterarVelocidade = (id, val) => {
  const t = acharTrecho(id);
  if (!t) return;
  const v = parseFloat(val);
  if (isNaN(v) || v <= 0 || v > 200) return;
  t.velocidade_kmh = v;
  t.duracao_estimada_s = t.distancia_m / (v / 3.6);
  redesenharTudo();
  renderLista();
};
window.removerTrecho = (id, ev) => {
  if (ev) ev.stopPropagation();
  if (!confirm('Remover trecho?')) return;
  const sentido = state.sentidoAtual;
  const l = linhaAtual();
  l[sentido].trechos = l[sentido].trechos.filter(t => t.id !== id);
  l[sentido].trechos.forEach((t, i) => t.ordem = i + 1);
  l[sentido].semaforos = l[sentido].semaforos.filter(s => s.trecho_id !== id);
  l[sentido].paradas   = l[sentido].paradas.filter(p => p.trecho_id !== id);
  redesenharTudo();
  renderLista();
};
window.alterarTempoSemaforo = (id, val) => {
  const s = listaSemaforos().find(x => x.id === id);
  if (!s) return;
  const v = parseFloat(val);
  if (isNaN(v) || v <= 0) return;
  s.tempo_parada_s = v;
  redesenharTudo();
};
window.removerSemaforo = (id, ev) => {
  if (ev) ev.stopPropagation();
  const l = linhaAtual();
  l[state.sentidoAtual].semaforos =
    l[state.sentidoAtual].semaforos.filter(s => s.id !== id);
  redesenharTudo();
  renderLista();
};
window.alterarTempoParada = (id, val) => {
  const p = listaParadas().find(x => x.id === id);
  if (!p) return;
  const v = parseFloat(val);
  if (isNaN(v) || v <= 0) return;
  p.tempo_parada_s = v;
  redesenharTudo();
};
window.removerParada = (id, ev) => {
  if (ev) ev.stopPropagation();
  const l = linhaAtual();
  l[state.sentidoAtual].paradas =
    l[state.sentidoAtual].paradas.filter(p => p.id !== id);
  redesenharTudo();
  renderLista();
};

/* ---------- Linhas (multi) ---------- */
function renderLinhaSelect() {
  const sel = document.getElementById('selLinha');
  sel.innerHTML = state.linhas.map((l, i) =>
    `<option value="${i}" ${i===state.linhaIdx?'selected':''}>${escapar(l.linha)} - ${escapar(l.nome)}</option>`
  ).join('');
  sel.disabled = !state.linhas.length;
}

window.adicionarLinha = () => {
  const nome = prompt('Código/nome da linha (ex: L002/10):');
  if (!nome?.trim()) return;
  const existente = state.linhas.findIndex(l => l.linha === nome.trim());
  if (existente >= 0) { showToast('Linha já existe'); document.getElementById('selLinha').value = existente; return; }
  const nomeDesc = prompt('Descrição (ex: METRÔ SANTANA):', '') || '';
  state.linhas.push({
    linha: nome.trim(), nome: nomeDesc.trim(),
    ida:   { trechos: [], semaforos: [], paradas: [] },
    volta: { trechos: [], semaforos: [], paradas: [] },
  });
  state.linhaIdx = state.linhas.length - 1;
  renderLinhaSelect();
  redesenharTudo();
  renderLista();
  showToast('Linha criada');
};

/* ---------- Export / Import ---------- */
function exportarJSON() {
  if (!state.linhas.length) { showToast('Nenhuma linha para exportar'); return; }
  const payload = {
    versao: 1,
    atualizado_em: new Date().toISOString(),
    linhas: state.linhas.map(l => ({
      linha: l.linha, nome: l.nome,
      ida:   { trechos: limparTrechos(l.ida.trechos),   semaforos: l.ida.semaforos,   paradas: l.ida.paradas   || [] },
      volta: { trechos: limparTrechos(l.volta.trechos), semaforos: l.volta.semaforos, paradas: l.volta.paradas || [] },
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tracados-vnc.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('JSON exportado');
}
function limparTrechos(arr) {
  return arr.map(t => ({
    id: t.id, ordem: t.ordem, nome: t.nome,
    velocidade_kmh: t.velocidade_kmh,
    pontos_origem: t.pontos_origem,
    geometria: t.geometria,
    distancia_m: Math.round(t.distancia_m * 10) / 10,
    duracao_estimada_s: Math.round(t.duracao_estimada_s * 10) / 10,
  }));
}

function carregarJSON(json) {
  desativarEdicao();
  layers.forEach(v => map.removeLayer(v.poly)); layers.clear();
  semaforoMarkers.forEach(m => map.removeLayer(m)); semaforoMarkers.clear();
  paradaMarkers.forEach(m => map.removeLayer(m)); paradaMarkers.clear();

  state.linhas = (json.linhas || []).map(l => ({
    linha: l.linha || '', nome: l.nome || '',
    ida:   { trechos: l.ida?.trechos   || [], semaforos: l.ida?.semaforos   || [], paradas: l.ida?.paradas   || [] },
    volta: { trechos: l.volta?.trechos || [], semaforos: l.volta?.semaforos || [], paradas: l.volta?.paradas || [] },
  }));
  state.linhaIdx = state.linhas.length ? 0 : -1;
  state.sentidoAtual = 'ida';
  state.selecionado = null;
  renderLinhaSelect();
  redesenharTudo();
  renderLista();

  const all = [];
  state.linhas.forEach(l => ['ida','volta'].forEach(s => l[s].trechos.forEach(t =>
    t.geometria.forEach(p => all.push([p.lat, p.lng])))));
  if (all.length) map.fitBounds(L.latLngBounds(all), { padding: [60,60] });

  showToast(`Carregadas ${state.linhas.length} linha(s)`);
}

/* ---------- UI helpers ---------- */
function setDrawMode(txt) { document.getElementById('drawMode').textContent = txt; }
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('statusToast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2500);
}
function escapar(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function haversineMetros(a, b) {
  const R = 6371000, rad = d => d*Math.PI/180;
  const dLat = rad(b.lat-a.lat), dLng = rad(b.lng-a.lng);
  const x = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}

function marcarModo(idBtn) {
  ['btnModoDesenho','btnModoSemaforo','btnModoParada','btnModoEditar'].forEach(id =>
    document.getElementById(id).classList.toggle('active-mode', id === idBtn));
}

/* ---------- Bind ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  renderLinhaSelect();
  renderLista();

  document.getElementById('selLinha').onchange = (e) => {
    desativarEdicao();
    state.linhaIdx = +e.target.value;
    state.selecionado = null;
    redesenharTudo();
    renderLista();
  };
  document.getElementById('btnAddLinha').onclick = adicionarLinha;
  document.getElementById('btnExport').onclick = exportarJSON;
  document.getElementById('btnImport').onclick = () => document.getElementById('fileInput').click();

  document.getElementById('btnModoDesenho').onclick = () => {
    desativarEdicao();
    state.modo = 'desenho';
    marcarModo('btnModoDesenho');
    setDrawMode('aguardando 1º clique');
  };
  document.getElementById('btnModoSemaforo').onclick = () => {
    desativarEdicao();
    state.modo = 'semaforo';
    marcarModo('btnModoSemaforo');
    setDrawMode('clique sobre o traçado para pôr semáforo');
  };
  document.getElementById('btnModoParada').onclick = () => {
    desativarEdicao();
    state.modo = 'parada';
    marcarModo('btnModoParada');
    setDrawMode('clique sobre o traçado para pôr parada');
  };
  document.getElementById('btnModoEditar').onclick = () => {
    state.modo = 'editar';
    marcarModo('btnModoEditar');
    setDrawMode('clique em "editar" no trecho para arrastar vértices');
  };

  document.getElementById('btnCancelDraw').onclick = () => {
    limparPendentes();
    desativarEdicao();
    state.pendenteOrigem = null;
    setDrawMode('aguardando 1º clique');
    showToast('Cancelado');
  };

  document.getElementById('fileInput').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { carregarJSON(JSON.parse(await f.text())); }
    catch (err) { showToast('JSON inválido: ' + err.message); }
    e.target.value = '';
  };

  if (window.lucide) lucide.createIcons();
});