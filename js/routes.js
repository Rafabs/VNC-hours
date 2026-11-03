/* ============================================================
   routes.html - Oficial
   - Importa data/tracados-vnc.json automaticamente
   - Carrega scheduleData
   - Inicia VehicleManager + trajectorySimulator
   - Painel "Em Viagem" no sidebar
   - Toggle de semáforos/paradas no header
   ============================================================ */

const ROUTES_CFG = {
  TRACADOS_URL: 'data/tracados-vnc.json',
};

let rotasMap;
let tracadosData = null;
let scheduleData = null;
let vehicleManager = null;

const layersTrecho = new Map();
const semaforoMarkersGlobais = new Map();
const paradaMarkersGlobais   = new Map();
const visibilidade = { semaforos: true, paradas: true };
const CORES = { ida: '#2ecc71', volta: '#3498db' };

/* ---------- Mapa ---------- */
function initRotasMap() {
  rotasMap = L.map('map').setView([-23.5505, -46.6333], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19,
  }).addTo(rotasMap);
  window.rotasMap = () => rotasMap;
}

/* ---------- Desenho ---------- */
function desenharTracados(tracados) {
  // Limpa layers antigos
  layersTrecho.forEach(l => rotasMap.removeLayer(l));
  layersTrecho.clear();
  semaforoMarkersGlobais.forEach(m => rotasMap.removeLayer(m));
  semaforoMarkersGlobais.clear();
  paradaMarkersGlobais.forEach(m => rotasMap.removeLayer(m));
  paradaMarkersGlobais.clear();

  if (!tracados?.linhas) return;

  const bbox = [];

  tracados.linhas.forEach(linha => {
    const coresLinha = buscarCoresLinhaNoSchedule(linha.linha);
    const corBg  = coresLinha.bg;
    const corTxt = coresLinha.txt;

    ['ida', 'volta'].forEach(sentido => {
      // 1) Trechos
      (linha[sentido]?.trechos || []).forEach(t => {
        const latlngs = t.geometria.map(p => [p.lat, p.lng]);
        latlngs.forEach(p => bbox.push(p));

        // Halo branco por baixo
        const halo = L.polyline(latlngs, {
          color: '#ffffff', weight: 10, opacity: .6,
          lineCap: 'round', lineJoin: 'round',
        }).addTo(rotasMap).bringToBack();
        layersTrecho.set(`${linha.linha}-${sentido}-${t.id}-halo`, halo);

        // Traçado na cor da linha
        const poly = L.polyline(latlngs, {
          color: corBg, weight: 6,
          opacity: sentido === 'ida' ? .95 : .75,
          dashArray: sentido === 'volta' ? '10,6' : null,
          lineCap: 'round', lineJoin: 'round',
        }).addTo(rotasMap);
        poly.bindTooltip(
          `${linha.linha} • ${sentido.toUpperCase()} • ${t.nome} • ${t.velocidade_kmh} km/h`,
          { sticky: true }
        );
        layersTrecho.set(`${linha.linha}-${sentido}-${t.id}`, poly);
      });

      // 2) Semáforos
      (linha[sentido]?.semaforos || []).forEach(s => {
        const icon = L.divIcon({
          className: '',
          html: `<div class="semaforo-marker">🚦</div>`,
          iconSize: [22, 22], iconAnchor: [11, 11],
        });
        const mk = L.marker([s.lat, s.lng], { icon }).addTo(rotasMap);
        mk.bindTooltip(`🚦 ${linha.linha} • ${s.tempo_parada_s}s`, { sticky: true });
        const k = `${linha.linha}-${sentido}-${s.id}`;
        semaforoMarkersGlobais.set(k, mk);
        if (!visibilidade.semaforos) rotasMap.removeLayer(mk);
      });

      // 3) Paradas
      (linha[sentido]?.paradas || []).forEach(p => {
        const icon = L.divIcon({
          className: '',
          html: `<div class="parada-marker">🚏</div>`,
          iconSize: [22, 22], iconAnchor: [11, 11],
        });
        const mk = L.marker([p.lat, p.lng], { icon }).addTo(rotasMap);
        mk.bindTooltip(`🚏 ${linha.linha} • ${p.tempo_parada_s}s`, { sticky: true });
        const k = `${linha.linha}-${sentido}-${p.id}`;
        paradaMarkersGlobais.set(k, mk);
        if (!visibilidade.paradas) rotasMap.removeLayer(mk);
      });
    });
  });

  if (bbox.length) rotasMap.fitBounds(L.latLngBounds(bbox), { padding: [60, 60] });
}

/* Busca BG_COLOR/TXT_COLOR da linha no scheduleData */
function buscarCoresLinhaNoSchedule(codigoLinha) {
  const data = window.vehicleManager?.currentScheduleData || scheduleData || [];
  const norm = s => String(s || '').toUpperCase().replace(/\s+/g, '').trim();
  const alvo = norm(codigoLinha);

  const partida = data.find(d => norm(d.line) === alvo);
  if (partida) {
    const bg  = partida.bgColor || partida.bg_color || partida.BG_COLOR
             || partida.bg || partida.corFundo;
    const txt = partida.textColor || partida.text_color || partida.TXT_COLOR
             || partida.txt || partida.corTexto;
    if (bg) return { bg, txt: txt || '#ffffff' };
  }
  return { bg: '#64748b', txt: '#ffffff' };
}

/* Badge flutuante com o código da linha */
function criarBadgeLinha(linha, corBg, corTxt) {
  const trechos = linha.ida.trechos;
  if (!trechos.length) return null;

  const meio = Math.floor(trechos.length / 2);
  const geom = trechos[meio].geometria;
  if (!geom?.length) return null;
  const ponto = geom[Math.floor(geom.length / 2)];

  const html = `
    <span style="
      background:${corBg}; color:${corTxt};
      padding:3px 10px; border-radius:8px;
      font-size:12px; font-weight:800; letter-spacing:.5px;
      box-shadow:0 2px 6px rgba(0,0,0,.5);
      border:2px solid #fff; white-space:nowrap;
    ">${esc(linha.linha)}</span>`;

  return L.marker([ponto.lat, ponto.lng], {
    icon: L.divIcon({
      className: '', html,
      iconSize: [80, 24], iconAnchor: [40, 12],
    }),
    interactive: false,
    zIndexOffset: 500,
  }).addTo(rotasMap);
}

/* ---------- Carregamento ---------- */
async function carregarTracados() {
  try {
    const resp = await fetch(ROUTES_CFG.TRACADOS_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} — ${ROUTES_CFG.TRACADOS_URL}`);
    tracadosData = await resp.json();
    desenharTracados(tracadosData);
    console.log('[routes] traçados:', tracadosData.linhas?.length ?? 0, 'linha(s)');
    return tracadosData;
  } catch (err) {
    console.error('[routes] falha ao carregar traçados:', err);
    alert(
      'Não foi possível carregar o traçado em:\n' +
      ROUTES_CFG.TRACADOS_URL +
      '\n\nVerifique se o arquivo existe. Use o botão de upload no mapa como alternativa.'
    );
    return null;
  }
}

async function carregarSchedule() {
  try {
    const sm = new ScheduleManager();
    scheduleData = await sm.loadScheduleData();
    if (!scheduleData || !scheduleData.length) {
      scheduleData = sm.getFallbackData();
    }
    console.log('[routes] schedule:', scheduleData.length, 'partidas');
    return scheduleData;
  } catch (err) {
    console.error('[routes] erro schedule:', err);
    return [];
  }
}

function initVehicleManager() {
  vehicleManager = new VehicleManager();
  vehicleManager.setCurrentScheduleData(scheduleData);
  window.vehicleManager = vehicleManager;

  vehicleManager.loadVehicleData().then(() => {
    vehicleManager.updateVehicleWithSchedule();
    vehicleManager.triggerVehicleUpdate();
    vehicleManager.startAutoUpdate();
    vehicleManager.startStatusMonitoring();
    renderPainelEmViagem();

    if (tracadosData) desenharTracados(tracadosData);
  });

  document.addEventListener('vehiclesUpdated', renderPainelEmViagem);
  document.addEventListener('vehicleStatusesChanged', renderPainelEmViagem);
}

/* ---------- Painel Em Viagem ---------- */
function renderPainelEmViagem() {
  if (!vehicleManager) return;
  const emViagem = vehicleManager.getVehiclesEmViagem();
  document.getElementById('emViagemCount').textContent = emViagem.length;

  const aguardando = vehicleManager.getVehiclesAguardando().length
                   + vehicleManager.getVehiclesNaPlataforma().length
                   + vehicleManager.getVehiclesAlinhando().length;
  const reserva = vehicleManager.getVehiclesReserva().length;
  document.getElementById('patioCount').textContent = aguardando;
  document.getElementById('reservaCount').textContent = reserva;

  const el = document.getElementById('emViagemList');
  if (!emViagem.length) {
    el.innerHTML = '<div class="hint-small">Nenhum veículo em viagem agora.</div>';
    return;
  }

  el.innerHTML = emViagem.map(v => {
    const sentido = calcularSentido(v);
    const destino = (v.linhaAtual ? buscarDestinoLinha(v.linhaAtual) : '') || '—';
    const progresso = calcularProgresso(v);
    return `
      <div class="trip-card ${sentido}">
        <div class="trip-top">
          <span class="prefixo-badge">${esc(v.prefixo)}</span>
          <span class="linha-badge">${esc(v.linhaAtual || '—')}</span>
          <span class="destino">${esc(destino)}</span>
        </div>
        <div class="trip-info">
          <span>Partiu: <b>${esc(v.ultimaPartida || '—')}</b></span>
          <span>Retorno: <b>${esc(v.horarioRetorno || '—')}</b></span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${progresso}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function calcularSentido(v) {
  if (!v.ultimaPartida || !v.duracaoViagem) return 'ida';
  const agora = new Date();
  const minAgora = agora.getHours()*60 + agora.getMinutes();
  const [h, m] = v.ultimaPartida.split(':').map(Number);
  const partida = h*60 + m;
  let decorrido = minAgora - partida;
  if (decorrido < 0) decorrido += 24*60;
  return decorrido <= v.duracaoViagem / 2 ? 'ida' : 'volta';
}

function calcularProgresso(v) {
  if (!v.ultimaPartida || !v.duracaoViagem) return 0;
  const agora = new Date();
  const minAgora = agora.getHours()*60 + agora.getMinutes();
  const [h, m] = v.ultimaPartida.split(':').map(Number);
  const partida = h*60 + m;
  let decorrido = minAgora - partida;
  if (decorrido < 0) decorrido += 24*60;
  const pct = (decorrido / v.duracaoViagem) * 100;
  return Math.max(0, Math.min(100, pct));
}

function buscarDestinoLinha(linha) {
  if (!tracadosData?.linhas) return '';
  const l = tracadosData.linhas.find(x => x.linha === linha);
  return l?.nome || '';
}

/* ---------- Tabs da sidebar ---------- */
function inicializarTabs() {
  document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const alvo = tab.dataset.tab;
      document.querySelectorAll('.sidebar-tab').forEach(t =>
        t.classList.toggle('active', t === tab));
      document.querySelectorAll('.sidebar-body').forEach(b =>
        b.style.display = b.dataset.body === alvo ? 'block' : 'none');
    });
  });
}

/* ---------- Toggle semáforos / paradas ---------- */
function alternarVisibilidade(tipo) {
  visibilidade[tipo] = !visibilidade[tipo];
  const mostrar = visibilidade[tipo];
  const map = rotasMap;

  if (tipo === 'semaforos') {
    semaforoMarkersGlobais.forEach(m => {
      if (mostrar) { if (!map.hasLayer(m)) m.addTo(map); }
      else { if (map.hasLayer(m)) map.removeLayer(m); }
    });
    document.getElementById('btnToggleSemaforos').classList.toggle('active', mostrar);
    showToast(`${mostrar ? '🚦 Mostrando' : '🚦 Ocultando'} semáforos`);
  } else if (tipo === 'paradas') {
    paradaMarkersGlobais.forEach(m => {
      if (mostrar) { if (!map.hasLayer(m)) m.addTo(map); }
      else { if (map.hasLayer(m)) map.removeLayer(m); }
    });
    document.getElementById('btnToggleParadas').classList.toggle('active', mostrar);
    showToast(`${mostrar ? '🚏 Mostrando' : '🚏 Ocultando'} paradas`);
  }
}

let toastTimerR;
function showToast(msg) {
  let el = document.getElementById('toast-routes');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-routes';
    el.className = 'status-toast hidden';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimerR);
  toastTimerR = setTimeout(() => el.classList.add('hidden'), 1800);
}

/* ---------- Boot ---------- */
async function boot() {
  initRotasMap();
  inicializarTabs();

  // Carrega schedule ANTES do traçado
  await carregarSchedule();
  const tracados = await carregarTracados();

  initVehicleManager();

  if (tracados) {
    const tentar = () => {
      if (vehicleManager.vehicles.size > 0) {
        iniciarSimulacao(tracados, vehicleManager);
        document.removeEventListener('vehiclesUpdated', tentar);
      }
    };
    tentar();
    document.addEventListener('vehiclesUpdated', tentar);
    setTimeout(tentar, 3000);
  }

  document.getElementById('btnCarregarTracado').onclick = () =>
    document.getElementById('jsonInput').click();
  document.getElementById('jsonInput').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      tracadosData = JSON.parse(await f.text());
      desenharTracados(tracadosData);
      atualizarTracadoSimulacao(tracadosData);
    } catch (err) { alert('JSON inválido: ' + err.message); }
    e.target.value = '';
  };

  document.getElementById('btnToggleSidebar').onclick = () =>
    document.getElementById('sidePanels').classList.toggle('hidden');

  document.getElementById('btnToggleSemaforos').onclick = () => alternarVisibilidade('semaforos');
  document.getElementById('btnToggleParadas').onclick = () => alternarVisibilidade('paradas');

  if (window.lucide) lucide.createIcons();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

document.addEventListener('DOMContentLoaded', boot);