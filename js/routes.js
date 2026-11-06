/* ============================================================
   routes.html - Oficial
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

/* ============================================================
   MAPA
   ============================================================ */
function initRotasMap() {
  rotasMap = L.map('map').setView([-23.5505, -46.6333], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19,
  }).addTo(rotasMap);
  window.rotasMap = () => rotasMap;
}

/* ============================================================
   DESENHO DE TRAÇADOS
   ============================================================ */
function desenharTracados(tracados) {
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
      (linha[sentido]?.trechos || []).forEach(t => {
        const latlngs = t.geometria.map(p => [p.lat, p.lng]);
        latlngs.forEach(p => bbox.push(p));

        const halo = L.polyline(latlngs, {
          color: '#ffffff', weight: 10, opacity: .6,
          lineCap: 'round', lineJoin: 'round',
        }).addTo(rotasMap).bringToBack();
        layersTrecho.set(`${linha.linha}-${sentido}-${t.id}-halo`, halo);

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

      (linha[sentido]?.semaforos || []).forEach(s => {
        const icon = L.divIcon({
          className: '', html: `<div class="semaforo-marker">🚦</div>`,
          iconSize: [22, 22], iconAnchor: [11, 11],
        });
        const mk = L.marker([s.lat, s.lng], { icon }).addTo(rotasMap);
        mk.bindTooltip(`🚦 ${linha.linha} • ${s.tempo_parada_s}s`, { sticky: true });
        const k = `${linha.linha}-${sentido}-${s.id}`;
        semaforoMarkersGlobais.set(k, mk);
        if (!visibilidade.semaforos) rotasMap.removeLayer(mk);
      });

      (linha[sentido]?.paradas || []).forEach(p => {
        const icon = L.divIcon({
          className: '', html: `<div class="parada-marker">🚏</div>`,
          iconSize: [22, 22], iconAnchor: [11, 11],
        });
        const mk = L.marker([p.lat, p.lng], { icon }).addTo(rotasMap);
        mk.bindTooltip(`🚏 ${linha.linha} • ${p.tempo_parada_s}s`, { sticky: true });
        const k = `${linha.linha}-${sentido}-${p.id}`;
        paradaMarkersGlobais.set(k, mk);
        if (!visibilidade.paradas) rotasMap.removeLayer(mk);
      });
    });

    if (linha.ida?.trechos?.length) {
      const badge = criarBadgeLinha(linha, corBg, corTxt);
      if (badge) layersTrecho.set(`${linha.linha}-badge`, badge);
    }
  });

  if (bbox.length) rotasMap.fitBounds(L.latLngBounds(bbox), { padding: [60, 60] });
}

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
    icon: L.divIcon({ className: '', html, iconSize: [80, 24], iconAnchor: [40, 12] }),
    interactive: false, zIndexOffset: 500,
  }).addTo(rotasMap);
}

/* ============================================================
   CARREGAMENTO
   ============================================================ */
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
      'Não foi possível carregar o traçado em:\n' + ROUTES_CFG.TRACADOS_URL +
      '\n\nVerifique se o arquivo existe.'
    );
    return null;
  }
}

async function carregarSchedule() {
  try {
    const sm = new ScheduleManager();
    scheduleData = await sm.loadScheduleDataWithRollover();
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

/* ============================================================
   ROLLOVER DE MEIA-NOITE
   ============================================================ */
async function recarregarScheduleComRollover() {
  try {
    const sm = new ScheduleManager();
    const novo = await sm.loadScheduleDataWithRollover();
    if (!novo || !novo.length) return;

    scheduleData = novo;
    if (vehicleManager) {
      vehicleManager.setCurrentScheduleData(novo);
      vehicleManager.updateVehicleWithSchedule();
      vehicleManager.triggerVehicleUpdate();
    }
    if (tracadosData) desenharTracados(tracadosData);
    if (tracadosData) window.atualizarTracadoSimulacao(tracadosData);

    console.log(`[routes] ✅ rollover OK — ${novo.length} partidas`);
    showToast(`🔄 Virada de dia: ${novo.length} partidas carregadas`);
  } catch (e) {
    console.error('[routes] erro no rollover:', e);
  }
}

function agendarRolloverDiario() {
  const agora = new Date();
  const proximaMeiaNoite = new Date(agora);
  proximaMeiaNoite.setHours(24, 1, 0, 0);
  const delay = proximaMeiaNoite - agora;

  setTimeout(async () => {
    console.log('[routes] 🔄 Virada de dia — recarregando com rollover...');
    await recarregarScheduleComRollover();
    agendarRolloverDiario();
  }, delay);

  console.log(`[routes] ⏰ Rollover agendado pra ${proximaMeiaNoite.toLocaleString()}`);
}

/* ============================================================
   VEHICLE MANAGER
   ============================================================ */
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
    renderPlataformas();

    if (tracadosData) desenharTracados(tracadosData);
  });

  document.addEventListener('vehiclesUpdated', renderPainelEmViagem);
  document.addEventListener('vehicleStatusesChanged', renderPainelEmViagem);
  document.addEventListener('vehiclesUpdated', renderPlataformas);
  document.addEventListener('vehicleStatusesChanged', renderPlataformas);

  // Countdown das plataformas (30s)
  setInterval(renderPlataformas, 30000);
}

/* ============================================================
   PAINEL EM VIAGEM
   ============================================================ */
function renderPainelEmViagem() {
  if (!vehicleManager) return;
  const emViagem = vehicleManager.getVehiclesEmViagem();
  document.getElementById('emViagemCount').textContent = emViagem.length;

  const aguardando = vehicleManager.getVehiclesAguardando().length;
  const reserva = vehicleManager.getVehiclesReserva().length;
  const alinhando = vehicleManager.getVehiclesAlinhando().length;
  const plataforma = vehicleManager.getVehiclesNaPlataforma().length;

  document.getElementById('patioCount').textContent = aguardando;
  document.getElementById('reservaCount').textContent = reserva;
  document.getElementById('plataformaCount').textContent = alinhando + plataforma;

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

/* ============================================================
   PAINEL PLATAFORMAS
   ============================================================ */
function renderPlataformas() {
  if (!vehicleManager) return;
  const el = document.getElementById('plataformasList');
  if (!el) return;

  // Agrupa por plataforma (só alinhando + na plataforma)
  const porPlataforma = new Map();
  vehicleManager.vehicles.forEach(v => {
    if (!v.plataforma) return;
    if (v.categoria !== 'plataforma' && v.categoria !== 'alinhando') return;
    porPlataforma.set(String(v.plataforma).padStart(2, '0'), v);
  });

  // 8 plataformas fixas
  const numeros = ['01','02','03','04','05','06','07','08'];
  const agora = new Date();
  const minAgora = agora.getHours() * 60 + agora.getMinutes();

  el.innerHTML = numeros.map(num => {
    const v = porPlataforma.get(num);
    if (!v) {
      return `
        <div class="plataforma-slot plataforma-vazia">
          <div class="pl-num">PLAT. ${num}</div>
          <div class="pl-livre">LIVRE</div>
        </div>
      `;
    }

    // Countdown até a partida
    const [hh, mm] = (v.proximaViagem || '00:00').split(':').map(Number);
    const partidaMin = hh * 60 + mm;
    let faltaMin = partidaMin - minAgora;
    if (faltaMin < 0) faltaMin += 24 * 60;

    const isAlinhando = v.categoria === 'alinhando';
    const corStatus = isAlinhando ? '#17a2b8' : '#f39c12';
    const labelStatus = isAlinhando ? 'ALINHANDO' : 'NA PLATAFORMA';

    // Cores da linha
    const coresLinha = buscarCoresLinhaNoSchedule(v.linhaAtual);

    return `
      <div class="plataforma-slot plataforma-ocupada ${isAlinhando ? 'alinhando' : 'na-plataforma'}"
           style="--cor-status:${corStatus}">
        <div class="pl-num">PLAT. ${num}</div>
        <div class="pl-veiculo">
          <span class="pl-prefixo">${esc(v.prefixo)}</span>
          <span class="pl-linha" style="background:${coresLinha.bg};color:${coresLinha.txt}">${esc(v.linhaAtual || '—')}</span>
        </div>
        <div class="pl-status" style="color:${corStatus}">
          <span class="pl-status-dot"></span>
          ${labelStatus}
        </div>
        <div class="pl-partida">
          <span class="pl-partida-hora">${esc(v.proximaViagem || '—')}</span>
          <span class="pl-partida-falta">${faltaMin} min</span>
        </div>
      </div>
    `;
  }).join('');
}

/* ============================================================
   HELPERS
   ============================================================ */
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

/* ============================================================
   TABS DA SIDEBAR
   ============================================================ */
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

/* ============================================================
   TOGGLE SEMÁFOROS / PARADAS
   ============================================================ */
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

/* ============================================================
   BOOT
   ============================================================ */
async function boot() {
  initRotasMap();
  inicializarTabs();

  await carregarSchedule();
  const tracados = await carregarTracados();

  initVehicleManager();
  agendarRolloverDiario();

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

  document.getElementById('btnExportLog').onclick = () => {
    if (!window.TripLogger) { showToast('Logger indisponível'); return; }
    const resumo = window.TripLogger.resumo();
    if (resumo.total === 0) { showToast('Nenhum log registrado ainda'); return; }
    const json = confirm(
      `Exportar ${resumo.total} viagens?\n\n` +
      `OK: ${resumo.porStatus.ok}\n` +
      `Ajustar: ${resumo.porStatus.ajustar}\n` +
      `Recolher: ${resumo.porStatus.recolher}\n` +
      `Diferença média: ${resumo.media} min\n\n` +
      `OK = JSON | Cancelar = CSV`
    );
    if (json) window.TripLogger.exportar();
    else window.TripLogger.exportarCSV();
  };

  if (window.lucide) lucide.createIcons();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

document.addEventListener('DOMContentLoaded', boot);