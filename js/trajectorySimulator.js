/* ============================================================
   trajectorySimulator.js - VNC (multi-linha + semáforos)
   Regra de viagem:
     - tFase  = relógio da fase (0..metade = ida, metade..duracao = volta)
     - tGeom  = tempo percorrido na geometria, respeitando km/h e semáforos
     - Se tGeom < tFase, veículo ESPERA no fim do traçado até o relógio bater
   ============================================================ */
const SIM_CFG = {
  NOME_ORIGEM: 'VILA NOVA CACHOEIRINHA',   // ← ajuste pro nome do seu pátio
};

const SimState = {
  tracados: null,
  veiculoMgr: null,
  cacheLinhas: new Map(),
  rodando: false,
  rafId: null,
  marcadores: new Map(),
};

function iniciarSimulacao(tracados, vehicleManagerInstance = null) {
  if (!tracados?.linhas?.length) return;
  const map = window.rotasMap?.();
  if (!map) { console.error('[sim] mapa não pronto'); return; }

  const mgr = vehicleManagerInstance || window.vehicleManager;
  if (!mgr) { console.error('[sim] VehicleManager ausente'); return; }

  SimState.tracados = tracados;
  SimState.veiculoMgr = mgr;
  SimState.cacheLinhas.clear();
  tracados.linhas.forEach(l => SimState.cacheLinhas.set(l.linha, prepararLinha(l)));

  document.addEventListener('vehiclesUpdated', sincronizarMarcadores);
  document.addEventListener('vehicleStatusesChanged', sincronizarMarcadores);
  document.addEventListener('vehicleTripFinished', e => removerMarcador(e.detail?.prefixo));

  sincronizarMarcadores();
  SimState.rodando = true;
  if (SimState.rafId) cancelAnimationFrame(SimState.rafId);
  loop();
  console.log('[sim] iniciado', { linhas: SimState.cacheLinhas.size });
}

/* ---------- Preparar linha ---------- */
function prepararLinha(linha) {
  return {
    ida:   prepararGrupo(linha.ida),
    volta: prepararGrupo(linha.volta),
  };
}

function prepararGrupo(grupo) {
  let acumulado = 0;
  const trechos = (grupo?.trechos || []).map(t => {
    const dur = t.duracao_estimada_s
      || (t.distancia_m / ((t.velocidade_kmh || 30) / 3.6));
    const entry = {
      id: t.id, inicioS: acumulado, fimS: acumulado + dur,
      geometria: t.geometria, velocidade_kmh: t.velocidade_kmh,
    };
    acumulado += dur;
    return entry;
  });

  // Mescla semáforos + paradas num único array de eventos de parada
  const eventosParada = [
    ...(grupo?.semaforos || []).map(s => ({ ...s, _tipo: 'semaforo' })),
    ...(grupo?.paradas   || []).map(p => ({ ...p, _tipo: 'parada'   })),
  ].map(s => {
    const tr = trechos.find(x => x.id === s.trecho_id);
    const t = tr ? tr.inicioS + (tr.fimS - tr.inicioS) * (s.fracao || 0) : 0;
    return { ...s, tNoTrechoS: t };
  }).sort((a, b) => a.tNoTrechoS - b.tNoTrechoS);

  // Mantém o nome "semaforos" pra não quebrar o resto do código
  const semaforos = eventosParada;

  return { trechos, semaforos, duracaoGeomS: acumulado };
}

/* ---------- Marcadores ---------- */
function sincronizarMarcadores() {
  const mgr = SimState.veiculoMgr;
  if (!mgr?.vehicles) return;

  const viagem = new Set();
  mgr.vehicles.forEach((v, prefixo) => {
    if (v.categoria === 'viagem' && v.ultimaPartida) {
      viagem.add(prefixo);
      if (!SimState.marcadores.has(prefixo)) criarMarcador(prefixo, v);
    }
  });
  for (const p of SimState.marcadores.keys())
    if (!viagem.has(p)) removerMarcador(p);
}

function criarMarcador(prefixo, veiculo) {
  const map = window.rotasMap?.();
  const cache = SimState.cacheLinhas.get(veiculo.linhaAtual);
  if (!map || !cache) return;
  const primeiro = cache.ida.trechos[0]?.geometria?.[0];
  if (!primeiro) return;

  const sentido = calcularSentidoSim(veiculo);
  const destino = buscarDestinoSim(veiculo.linhaAtual);
  const imgUrl = imagemDoVeiculo(veiculo, sentido);

  const html = `
    <div class="vehicle-wrap">
      <div class="vehicle-balloon ${sentido}">
        <span class="vb-prefixo">${escSim(prefixo)}</span>
        <span class="vb-linha">${escSim(veiculo.linhaAtual || '—')}</span>
        <span class="vb-destino">${escSim(destino || sentido.toUpperCase())}</span>
      </div>
      <img class="vehicle-icon" src="${imgUrl}" alt="${escSim(prefixo)}" />
    </div>
  `;

  const icon = L.divIcon({
    className: '',
    html,
    iconSize: [180, 80],
    iconAnchor: [90, 70],   // âncora na parte de baixo (onde fica a imagem)
  });

  const marker = L.marker([primeiro.lat, primeiro.lng], {
    icon, zIndexOffset: 1000,
  }).addTo(map);

  // Fallback se a imagem não carregar
  setTimeout(() => {
    const img = marker.getElement()?.querySelector('.vehicle-icon');
    if (img && !img.complete) {
      img.onerror = () => {
        img.style.display = 'none';
        const fb = document.createElement('div');
        fb.className = 'vehicle-icon no-img';
        fb.textContent = prefixo.split(' ').pop();
        img.parentNode.appendChild(fb);
      };
    } else if (img && img.naturalWidth === 0) {
      img.style.display = 'none';
      const fb = document.createElement('div');
      fb.className = 'vehicle-icon no-img';
      fb.textContent = prefixo.split(' ').pop();
      img.parentNode.appendChild(fb);
    }
  }, 200);

  SimState.marcadores.set(prefixo, {
  marker,
  veiculo,
  prefixo,
  sentido,   // ← guarda o sentido atual
});
}

function buscarCoresDaLinha(veiculo) {
  const data = window.vehicleManager?.currentScheduleData || [];
  // Encontra a partida deste veículo (por prefixo + linha + horário de partida)
  const partida = data.find(d =>
    d.vehicle === veiculo.prefixo &&
    d.line === veiculo.linhaAtual &&
    d.time === veiculo.ultimaPartida
  );
  if (partida) {
    return {
      bg: partida.bgColor || '#334155',
      txt: partida.textColor || '#ffffff',
    };
  }
  // Fallback: pega só pela linha (primeira partida)
  const porLinha = data.find(d => d.line === veiculo.linhaAtual);
  if (porLinha) return {
    bg: porLinha.bgColor || '#334155',
    txt: porLinha.textColor || '#ffffff',
  };
  return { bg: '#334155', txt: '#ffffff' };
}

const MODELO_ALIASES = {
  // Millennium 4
  'MILLENNIUM 4': 'M4',
  'MILLENNIUM4': 'M4',
  'MILLENNIUM-4': 'M4',
  'M4': 'M4',

  // Millennium 5
  'MILLENNIUM 5': 'M5',
  'MILLENNIUM5': 'M5',
  'MILLENNIUM-5': 'M5',
  'M5': 'M5',

  // BRT II — variações com que o JSON pode vir
  'BRT II': 'BRTII',
  'BRTII': 'BRTII',
  'BRT-2': 'BRTII',
  'BRT 2': 'BRTII',
  'MILLENNIUM BRT II 23M': 'BRTII',
  'MILLENNIUM BRTII 23M': 'BRTII',
  'MILLENNIUM BRT II': 'BRTII',
  'MILLENNIUM BRTII': 'BRTII',
  'BRT II 23M': 'BRTII',
};

const TIPO_ALIASES = {
  'PADRON': 'PADRON',
  'PADRÃO': 'PADRON',
  'PADRAO': 'PADRON',
  'ARTICULADO': 'ARTICULADO',
  'SUPERARTICULADO': 'SUPERARTICULADO',
  'SUPER ARTICULADO': 'SUPERARTICULADO',
};

function normalizar(valor, aliases) {
  const v = String(valor || '').toUpperCase().trim();
  if (aliases[v]) return aliases[v];
  // tenta variações com espaço/hífen
  for (const [key, val] of Object.entries(aliases)) {
    if (v.replace(/[\s\-_]+/g, '') === key.replace(/[\s\-_]+/g, '')) return val;
  }
  return v;
}

function imagemDoVeiculo(veiculo, sentido) {
  const modelo = normalizar(veiculo.modelo, MODELO_ALIASES);
  const tipo   = normalizar(veiculo.tipo,   TIPO_ALIASES);
  const s      = sentido === 'volta' ? 'VOLTA' : 'IDA';

  if (!modelo || !tipo) return placeholderImg(veiculo);

  // Codifica o nome do arquivo (espaços, acentos, etc.)
  const arquivo = `${modelo}-${tipo}-${s}.jpg`;
  return `img/vehicles/${encodeURIComponent(arquivo)}`;
}

function placeholderImg(veiculo) {
  // SVG data-uri: círculo com sufixo do prefixo (último trecho depois do espaço)
  const suf = String(veiculo.prefixo || '?').split(' ').pop();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
    <circle cx="20" cy="20" r="18" fill="#2ecc71" stroke="#fff" stroke-width="2"/>
    <text x="20" y="25" text-anchor="middle" font-family="sans-serif" font-size="11"
          font-weight="700" fill="#fff">${suf}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

function calcularSentidoSim(veiculo) {
  if (!veiculo.ultimaPartida || !veiculo.duracaoViagem) return 'ida';
  const agora = new Date();
  const minAgora = agora.getHours()*60 + agora.getMinutes();
  const [h, m] = veiculo.ultimaPartida.split(':').map(Number);
  const partida = h*60 + m;
  let decorrido = minAgora - partida;
  if (decorrido < 0) decorrido += 24*60;
  return decorrido <= veiculo.duracaoViagem / 2 ? 'ida' : 'volta';
}

function buscarDestinoSim(linha) {
  if (!SimState.tracados?.linhas) return '';
  const l = SimState.tracados.linhas.find(x => x.linha === linha);
  return l?.nome || '';
}

function removerMarcador(p) {
  const entry = SimState.marcadores.get(p);
  if (!entry) return;
  window.rotasMap?.()?.removeLayer(entry.marker);
  SimState.marcadores.delete(p);
}

function loop() {
  if (!SimState.rodando) return;
  const mgr = SimState.veiculoMgr;
  if (mgr?.vehicles) {
    mgr.vehicles.forEach((v, prefixo) => {
      if (v.categoria !== 'viagem' || !v.ultimaPartida) return;
      const entry = SimState.marcadores.get(prefixo);
      if (!entry) return;

      // Atualiza posição
      const pos = posicaoAtual(v);
      if (pos) entry.marker.setLatLng([pos.lat, pos.lng]);

      // Recalcula sentido e atualiza balão/imagem se mudou
      const sentidoAtual = calcularSentidoSim(v);
      if (entry.sentido !== sentidoAtual) {
        entry.sentido = sentidoAtual;
        atualizarVisualMarcador(entry, v, sentidoAtual);
      }
    });
  }
  SimState.rafId = requestAnimationFrame(loop);
}

function destinoDoSentido(veiculo, sentido) {
  const destinoPlanilha = buscarDestinoSim(veiculo.linhaAtual)
    || buscarDestinoPartida(veiculo)
    || '—';
  if (sentido === 'volta') return SIM_CFG.NOME_ORIGEM;
  return destinoPlanilha;
}

/* Busca o DESTINO específico da partida no scheduleData (mais preciso que o nome da linha) */
function buscarDestinoPartida(veiculo) {
  const data = window.vehicleManager?.currentScheduleData || [];
  const p = data.find(d =>
    d.vehicle === veiculo.prefixo &&
    d.line === veiculo.linhaAtual &&
    d.time === veiculo.ultimaPartida
  );
  return p?.destination || null;
}

function criarMarcador(prefixo, veiculo) {
  const map = window.rotasMap?.();
  const cache = SimState.cacheLinhas.get(veiculo.linhaAtual);
  if (!map || !cache) return;
  const primeiro = cache.ida.trechos[0]?.geometria?.[0];
  if (!primeiro) return;

  const sentido = calcularSentidoSim(veiculo);
  const cores = buscarCoresDaLinha(veiculo);
  const destino = destinoDoSentido(veiculo, sentido);
  const imgUrl = imagemDoVeiculo(veiculo, sentido);

  const html = `
    <div class="vehicle-wrap">
      <div class="vehicle-balloon ${sentido}">
        <span class="vb-prefixo">${escSim(prefixo)}</span>
        <span class="vb-linha" style="background:${cores.bg};color:${cores.txt}">${escSim(veiculo.linhaAtual || '—')}</span>
        <span class="vb-destino">${escSim(destino)}</span>
      </div>
      <img class="vehicle-icon" src="${imgUrl}" alt="${escSim(prefixo)}"
           style="border-color:${sentido==='volta'?'#3498db':'#2ecc71'}" />
    </div>
  `;

  const icon = L.divIcon({
    className: '', html,
    iconSize: [180, 80], iconAnchor: [90, 70],
  });
  const marker = L.marker([primeiro.lat, primeiro.lng], { icon, zIndexOffset: 1000 }).addTo(map);

  SimState.marcadores.set(prefixo, { marker, veiculo, prefixo, sentido });
}

function atualizarVisualMarcador(entry, veiculo, sentido) {
  const el = entry.marker.getElement();
  if (!el) return;

  const cores = buscarCoresDaLinha(veiculo);
  const destino = destinoDoSentido(veiculo, sentido);
  const imgUrl = imagemDoVeiculo(veiculo, sentido);

  const balloon = el.querySelector('.vehicle-balloon');
  if (balloon) {
    balloon.className = `vehicle-balloon ${sentido}`;
    balloon.innerHTML = `
      <span class="vb-prefixo">${escSim(entry.prefixo)}</span>
      <span class="vb-linha" style="background:${cores.bg};color:${cores.txt}">${escSim(veiculo.linhaAtual || '—')}</span>
      <span class="vb-destino">${escSim(destino)}</span>
    `;
  }
  const img = el.querySelector('.vehicle-icon');
  if (img && img.tagName === 'IMG' && img.src.indexOf(imgUrl) === -1) {
    img.src = imgUrl;
    img.style.borderColor = sentido === 'volta' ? '#3498db' : '#2ecc71';
  }
}

/* ---------- Posição ---------- */
function posicaoAtual(veiculo) {
  const cache = SimState.cacheLinhas.get(veiculo.linhaAtual);
  if (!cache) return null;

  const agora = new Date();
  const minAgora = agora.getHours() * 60 + agora.getMinutes() + agora.getSeconds() / 60;

  const [h, m] = veiculo.ultimaPartida.split(':').map(Number);
  const partidaMin = h * 60 + m;

  const duracaoMin = veiculo.duracaoViagem || 90;
  const metadeMin = duracaoMin / 2;

  let decorrido = minAgora - partidaMin;
  if (decorrido < 0) decorrido += 24 * 60;
  if (decorrido > duracaoMin) return null;

  // Qual fase
  const ehIda = decorrido <= metadeMin;
  const grupo = ehIda ? cache.ida : cache.volta;

  // tFase: posição no relógio da fase (em segundos)
  const tFaseS = (ehIda ? decorrido : decorrido - metadeMin) * 60;
  const tFaseMaxS = metadeMin * 60; // duração nominal da fase

  // Duração real percorrendo a geometria (respeitando km/h + semáforos)
  const tGeomPercorridoS = duracaoGeomComSemaforos(grupo, tFaseS);
  const duracaoRealS = grupo.duracaoGeomS + tempoTotalParadas(grupo);

  // Se a geometria demora mais que o tFase nominal, usamos o tFase
  // (não tem como "esperar" — o veículo segue o relógio).
  // Se demora menos, ele chega cedo e ESPERA no fim.
  let tEfetivoS;
  if (tGeomPercorridoS >= tFaseS || duracaoRealS >= tFaseMaxS) {
    // Geometria é o gargalo → segue a posição geométrica em tempo real
    tEfetivoS = tGeomPercorridoS;
  } else {
    // Relógio é o gargalo → anda até onde a velocidade permite
    // (não passa da duração geométrica)
    tEfetivoS = Math.min(tGeomPercorridoS, duracaoRealS);
  }

  // Traduz tEfetivoS (com paradas) em tBruto no traçado (sem paradas)
  const tBrutoS = removerParadas(grupo, tEfetivoS);

  // Se já terminou o traçado, fica no fim esperando
  if (tBrutoS >= grupo.duracaoGeomS) {
    const geomFim = grupo.trechos[grupo.trechos.length - 1].geometria;
    return geomFim[geomFim.length - 1];
  }

  return posicaoNoGrupoPorTempoBruto(grupo, tBrutoS);
}

/* ---------- Tempo com semáforos ---------- */
function tempoTotalParadas(grupo) {
  return grupo.semaforos.reduce((s, x) => s + x.tempo_parada_s, 0);
}

/* Dado tBruto (sem paradas), retorna o tempo efetivo (com paradas) até esse ponto */
function adicionarParadas(grupo, tBrutoS) {
  let extra = 0;
  for (const s of grupo.semaforos) {
    if (s.tNoTrechoS + extra <= tBrutoS) extra += s.tempo_parada_s;
    else break;
  }
  return tBrutoS + extra;
}

/* Inverso: dado tEfetivoS (com paradas), retorna tBruto (sem paradas) */
function removerParadas(grupo, tEfetivoS) {
  let tBruto = tEfetivoS;
  let paradas = 0;
  for (const s of grupo.semaforos) {
    const chegadaEfetiva = s.tNoTrechoS + paradas;
    if (tBruto >= chegadaEfetiva + s.tempo_parada_s) {
      paradas += s.tempo_parada_s;
    } else if (tBruto >= chegadaEfetiva && tBruto < chegadaEfetiva + s.tempo_parada_s) {
      // Está parado no semáforo → congela no ponto
      return s.tNoTrechoS;
    } else {
      break;
    }
  }
  return Math.max(0, tBruto - paradas);
}

/* Quanto tempo já foi gasto pra percorrer até tFaseS, considerando velocidades reais */
function duracaoGeomComSemaforos(grupo, tFaseS) {
  // Avança no tempo real da fase até acabar o tempo geométrico
  // Simples: o tempo efetivo máximo é duracaoGeomS + paradas.
  // O que "anda" no mapa é limitado por tFaseS (relógio).
  return Math.min(tFaseS, grupo.duracaoGeomS + tempoTotalParadas(grupo));
}

/* ---------- Posicionamento ---------- */
function posicaoNoGrupoPorTempoBruto(grupo, tBrutoS) {
  const { trechos, duracaoGeomS } = grupo;
  if (!trechos.length || duracaoGeomS <= 0) return null;

  const t = Math.max(0, Math.min(duracaoGeomS, tBrutoS));
  const tr = trechos.find(x => t >= x.inicioS && t <= x.fimS) || trechos[trechos.length - 1];
  const f = (t - tr.inicioS) / (tr.fimS - tr.inicioS);
  return interpolarNaGeometria(tr.geometria, f);
}

/* ---------- Geo ---------- */
function interpolarNaGeometria(geom, fracao) {
  if (!geom?.length) return null;
  if (geom.length === 1) return geom[0];
  const d = [0];
  for (let i = 1; i < geom.length; i++)
    d.push(d[i-1] + haversine(geom[i-1], geom[i]));
  const total = d[d.length-1];
  const alvo = fracao * total;
  for (let i = 1; i < d.length; i++) {
    if (alvo <= d[i]) {
      const seg = d[i] - d[i-1];
      const f = seg > 0 ? (alvo - d[i-1]) / seg : 0;
      return {
        lat: geom[i-1].lat + (geom[i].lat - geom[i-1].lat) * f,
        lng: geom[i-1].lng + (geom[i].lng - geom[i-1].lng) * f,
      };
    }
  }
  return geom[geom.length-1];
}
function haversine(a, b) {
  const R = 6371000, rad = d => d*Math.PI/180;
  const dLat = rad(b.lat-a.lat), dLng = rad(b.lng-a.lng);
  const x = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
function escSim(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------- Controles ---------- */
window.pararSimulacao = () => {
  SimState.rodando = false;
  if (SimState.rafId) cancelAnimationFrame(SimState.rafId);
  SimState.rafId = null;
};
window.reiniciarSimulacao = () => {
  window.pararSimulacao();
  for (const p of Array.from(SimState.marcadores.keys())) removerMarcador(p);
  if (SimState.tracados) iniciarSimulacao(SimState.tracados, SimState.veiculoMgr);
};
window.atualizarTracadoSimulacao = (tracados) => {
  window.pararSimulacao();
  for (const p of Array.from(SimState.marcadores.keys())) removerMarcador(p);
  iniciarSimulacao(tracados, SimState.veiculoMgr);
};