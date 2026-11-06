/* ============================================================
   trajectorySimulator.js - VNC (multi-linha + semáforos + popup + log)
   Regra de viagem:
     - tFase  = relógio da fase (0..metade = ida, metade..duracao = volta)
     - tGeom  = tempo percorrido na geometria, respeitando km/h e semáforos
     - Se tGeom < tFase, veículo ESPERA no fim do traçado até o relógio bater
     - Ao chegar no VNC (fim da volta), registra log de viagem
   ============================================================ */
const SIM_CFG = {
  NOME_ORIGEM: 'VILA NOVA CACHOEIRINHA',
  TEMPO_PARADA_TERMINAL_S: 360,   // 6 min default (5-7 range)
};

const SimState = {
  tracados: null,
  veiculoMgr: null,
  cacheLinhas: new Map(),
  rodando: false,
  rafId: null,
  marcadores: new Map(),
  logados: new Set(),   // evita duplicar log da mesma viagem
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
  SimState.logados = new Set();
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

  const eventosParada = [
    ...(grupo?.semaforos || []).map(s => ({ ...s, _tipo: 'semaforo' })),
    ...(grupo?.paradas   || []).map(p => ({ ...p, _tipo: 'parada'   })),
  ].map(s => {
    const tr = trechos.find(x => x.id === s.trecho_id);
    const t = tr ? tr.inicioS + (tr.fimS - tr.inicioS) * (s.fracao || 0) : 0;
    return { ...s, tNoTrechoS: t };
  }).sort((a, b) => a.tNoTrechoS - b.tNoTrechoS);

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
           style="border-color:${sentido === 'volta' ? '#3498db' : '#2ecc71'}" />
    </div>
  `;

  const icon = L.divIcon({
    className: '', html,
    iconSize: [180, 80], iconAnchor: [90, 70],
  });
  const marker = L.marker([primeiro.lat, primeiro.lng], { icon, zIndexOffset: 1000 }).addTo(map);

  setTimeout(() => {
    const img = marker.getElement()?.querySelector('.vehicle-icon');
    if (!img) return;
    const aplicarFallback = () => {
      img.style.display = 'none';
      const fb = document.createElement('div');
      fb.className = 'vehicle-icon no-img';
      fb.textContent = prefixo.split(' ').pop();
      img.parentNode.appendChild(fb);
    };
    if (!img.complete) img.onerror = aplicarFallback;
    else if (img.naturalWidth === 0) aplicarFallback();
  }, 200);

  const entry = {
    marker, veiculo, prefixo, sentido,
    popupAberto: false,
    statusAtual: null,
  };
  SimState.marcadores.set(prefixo, entry);

  marker.bindPopup(
    () => gerarPopupVeiculo(prefixo, veiculo, entry.statusAtual),
    { maxWidth: 320, className: 'vehicle-popup', autoPan: true }
  );
  marker.on('popupopen', () => { entry.popupAberto = true; });
  marker.on('popupclose', () => { entry.popupAberto = false; });
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

function removerMarcador(p) {
  const entry = SimState.marcadores.get(p);
  if (!entry) return;
  window.rotasMap?.()?.removeLayer(entry.marker);
  SimState.marcadores.delete(p);
}

/* ---------- Loop ---------- */
let ultimaSincronizacao = 0;

function loop() {
  if (!SimState.rodando) return;
  const agora = Date.now();

  if (agora - ultimaSincronizacao > 1000) {
    ultimaSincronizacao = agora;
    sincronizarMarcadores();
  }

  const mgr = SimState.veiculoMgr;
  if (mgr?.vehicles) {
    mgr.vehicles.forEach((v, prefixo) => {
      const entry = SimState.marcadores.get(prefixo);
      if (!entry) return;

      if (v.categoria !== 'viagem' || !v.ultimaPartida) {
        removerMarcador(prefixo);
        return;
      }

      const pos = posicaoAtual(v);
      if (!pos) {
        // Fim da viagem → registra log e remove marcador
        registrarFimDeViagem(v);
        removerMarcador(prefixo);
        return;
      }

      entry.marker.setLatLng([pos.lat, pos.lng]);
      entry.statusAtual = pos.status;

      if (entry.popupAberto) {
        entry.marker.setPopupContent(gerarPopupVeiculo(prefixo, v, pos.status));
      }

      const sentidoAtual = calcularSentidoSim(v);
      if (entry.sentido !== sentidoAtual) {
        entry.sentido = sentidoAtual;
        atualizarVisualMarcador(entry, v, sentidoAtual);
      }
    });
  }

  SimState.rafId = requestAnimationFrame(loop);
}

/* ---------- Log de fim de viagem ---------- */
function registrarFimDeViagem(veiculo) {
  const chave = `${veiculo.prefixo}|${veiculo.linhaAtual}|${veiculo.ultimaPartida}`;
  if (SimState.logados.has(chave)) return;
  SimState.logados.add(chave);

  const [h, m] = veiculo.ultimaPartida.split(':').map(Number);
  const partidaMin = h * 60 + m;
  const duracaoMin = veiculo.duracaoViagem || 90;

  const paradaTerminalMin = Math.min(
    veiculo.tempoParadaTerminal ?? (SIM_CFG.TEMPO_PARADA_TERMINAL_S / 60),
    duracaoMin * 0.4
  );
  const faseDuracaoMin = (duracaoMin - paradaTerminalMin) / 2;

  const chegadaTerminal = minParaHHMM(partidaMin + faseDuracaoMin);
  const saidaTerminal = minParaHHMM(partidaMin + faseDuracaoMin + paradaTerminalMin);
  const chegadaVNC = minParaHHMM(partidaMin + duracaoMin);

  const proxima = buscarProximaViagem(veiculo);
  const proximaMin = proxima ? parseHHMM(proxima.time) : null;
  const chegadaVNCmin = partidaMin + duracaoMin;
  const diferencaMin = proximaMin != null ? (proximaMin - chegadaVNCmin) : null;

  let status, sugestao;
  if (diferencaMin == null) {
    status = 'recolher';
    sugestao = 'Sem próxima viagem — recolher ao pátio';
  } else if (diferencaMin < 0) {
    status = 'ajustar';
    sugestao = `Chegou ${-diferencaMin}min APÓS a próxima partida — ajustar viagem para ${minParaHHMM(chegadaVNCmin + 5)}`;
  } else if (diferencaMin < 5) {
    status = 'ajustar';
    sugestao = `Apenas ${diferencaMin}min de folga — ajustar próxima viagem para ${minParaHHMM(chegadaVNCmin + 5)}`;
  } else {
    status = 'ok';
    sugestao = `${diferencaMin}min de folga`;
  }

  if (window.TripLogger) {
    window.TripLogger.registrarViagem(veiculo, {
      chegadaTerminal,
      paradaTerminalMin: paradaTerminalMin.toFixed(1),
      saidaTerminal,
      chegadaVNC,
      proximaViagem: proxima ? proxima.time : null,
      diferencaMin,
      status,
      sugestao,
      _doDiaAnterior: proxima?._doDiaAnterior || false,
    });
  }
}

function buscarProximaViagem(veiculo) {
  const data = window.vehicleManager?.currentScheduleData || [];
  const partidaMin = parseHHMM(veiculo.ultimaPartida);
  const candidatas = data
    .filter(d => d.vehicle === veiculo.prefixo && d.line === veiculo.linhaAtual)
    .map(d => ({ ...d, _min: parseHHMM(d.time) }))
    .filter(d => d._min > partidaMin)
    .sort((a, b) => a._min - b._min);
  return candidatas[0] || null;
}

function parseHHMM(str) {
  if (!str) return null;
  const [h, m] = str.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function minParaHHMM(min) {
  const total = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = Math.floor(total % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
  const paradaTerminalMin = Math.min(
    veiculo.tempoParadaTerminal ?? (SIM_CFG.TEMPO_PARADA_TERMINAL_S / 60),
    duracaoMin * 0.4
  );
  const faseDuracaoMin = (duracaoMin - paradaTerminalMin) / 2;

  let decorrido = minAgora - partidaMin;
  if (decorrido < 0) decorrido += 24 * 60;
  if (decorrido > duracaoMin) return null;

  const tIdaFim = faseDuracaoMin;
  const tParadaFim = faseDuracaoMin + paradaTerminalMin;
  const tVoltaFim = duracaoMin;

  let fase, tFaseS, tFaseMaxS;

  if (decorrido <= tIdaFim) {
    fase = 'ida';
    tFaseS = decorrido * 60;
    tFaseMaxS = faseDuracaoMin * 60;
  } else if (decorrido <= tParadaFim) {
    // Parada no terminal oposto
    const faltaS = (tParadaFim - decorrido) * 60;
    const grupo = cache.ida;
    const geomFim = grupo.trechos[grupo.trechos.length - 1].geometria;
    const pos = geomFim[geomFim.length - 1];
    return {
      lat: pos.lat,
      lng: pos.lng,
      status: {
        fase: 'ida',
        progresso: 1,
        parado: null,
        aguardando: { faltaS, tipo: 'terminal' },
        tFaseS: faseDuracaoMin * 60,
        tFaseMaxS: faseDuracaoMin * 60,
      },
    };
  } else {
    fase = 'volta';
    tFaseS = (decorrido - tParadaFim) * 60;
    tFaseMaxS = faseDuracaoMin * 60;
  }

  const grupo = fase === 'ida' ? cache.ida : cache.volta;

  const tGeomPercorridoS = duracaoGeomComSemaforos(grupo, tFaseS);
  const duracaoRealS = grupo.duracaoGeomS + tempoTotalParadas(grupo);

  let tEfetivoS;
  if (tGeomPercorridoS >= tFaseS || duracaoRealS >= tFaseMaxS) {
    tEfetivoS = tGeomPercorridoS;
  } else {
    tEfetivoS = Math.min(tGeomPercorridoS, duracaoRealS);
  }

  const tBrutoS = removerParadas(grupo, tEfetivoS);

  let parado = null;
  let aguardando = null;

  if (tBrutoS >= grupo.duracaoGeomS) {
    const falta = Math.max(0, (tFaseMaxS - tFaseS) / 60);
    if (falta > 0.05) {
      aguardando = { faltaS: falta * 60 };
    }
  } else {
    let paradasCumpridas = 0;
    for (const s of grupo.semaforos) {
      const tChegada = s.tNoTrechoS + paradasCumpridas;
      const tSaida   = tChegada + s.tempo_parada_s;
      if (tEfetivoS >= tChegada && tEfetivoS < tSaida) {
        parado = {
          tipo: s._tipo || 'semaforo',
          id: s.id || '',
          faltaS: tSaida - tEfetivoS,
          totalS: s.tempo_parada_s,
        };
        break;
      }
      if (tEfetivoS >= tSaida) paradasCumpridas += s.tempo_parada_s;
    }
  }

  const progresso = Math.max(0, Math.min(1, tFaseS / tFaseMaxS));

  let pos = null;
  if (tBrutoS >= grupo.duracaoGeomS) {
    const geomFim = grupo.trechos[grupo.trechos.length - 1].geometria;
    pos = geomFim[geomFim.length - 1];
  } else {
    pos = posicaoNoGrupoPorTempoBruto(grupo, tBrutoS);
  }
  if (!pos) return null;

  return {
    lat: pos.lat,
    lng: pos.lng,
    status: {
      fase,
      progresso,
      parado,
      aguardando,
      tFaseS,
      tFaseMaxS,
    },
  };
}

/* ---------- Tempo com semáforos ---------- */
function tempoTotalParadas(grupo) {
  return grupo.semaforos.reduce((s, x) => s + x.tempo_parada_s, 0);
}
function adicionarParadas(grupo, tBrutoS) {
  let extra = 0;
  for (const s of grupo.semaforos) {
    if (s.tNoTrechoS + extra <= tBrutoS) extra += s.tempo_parada_s;
    else break;
  }
  return tBrutoS + extra;
}
function removerParadas(grupo, tEfetivoS) {
  let tBruto = tEfetivoS;
  let paradas = 0;
  for (const s of grupo.semaforos) {
    const chegadaEfetiva = s.tNoTrechoS + paradas;
    if (tBruto >= chegadaEfetiva + s.tempo_parada_s) {
      paradas += s.tempo_parada_s;
    } else if (tBruto >= chegadaEfetiva && tBruto < chegadaEfetiva + s.tempo_parada_s) {
      return s.tNoTrechoS;
    } else {
      break;
    }
  }
  return Math.max(0, tBruto - paradas);
}
function duracaoGeomComSemaforos(grupo, tFaseS) {
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

/* ---------- Popup ---------- */
function gerarPopupVeiculo(prefixo, veiculo, status) {
  if (!status) {
    return `<div style="padding:8px;color:#94a3b8;font-size:12px">Calculando…</div>`;
  }
  const { fase, progresso, parado, aguardando } = status;
  const pct = Math.round(progresso * 100);
  const cor = fase === 'ida' ? '#2ecc71' : '#3498db';
  const destino = destinoDoSentido(veiculo, fase);
  const cores = buscarCoresDaLinha(veiculo);

  let statusTxt = '', statusCor = cor, statusIcon = '🚌';
  if (aguardando) {
    const min = Math.floor(aguardando.faltaS / 60);
    const seg = Math.floor(aguardando.faltaS % 60);
    statusIcon = '⏸️'; statusCor = '#f39c12';
    if (aguardando.tipo === 'terminal') {
      statusTxt = `Parada no terminal · ${min}:${String(seg).padStart(2,'0')} restantes`;
    } else if (fase === 'ida') {
      statusTxt = `Aguardando para iniciar a volta · ${min}:${String(seg).padStart(2,'0')}`;
    } else {
      statusTxt = `Aguardando fim da viagem · ${min}:${String(seg).padStart(2,'0')}`;
    }
  } else if (parado) {
    const seg = Math.ceil(parado.faltaS);
    statusIcon = parado.tipo === 'parada' ? '🚏' : '🚦';
    statusCor = parado.tipo === 'parada' ? '#3498db' : '#f39c12';
    const label = parado.tipo === 'parada' ? 'Parada' : 'Semáforo';
    statusTxt = `Parado no ${label} · ${seg}s restantes`;
  } else {
    statusTxt = fase === 'ida' ? 'Em deslocamento (ida)' : 'Em deslocamento (volta)';
  }

  return `
    <div class="vp-container">
      <div class="vp-header">
        <span class="vp-prefixo" style="background:${cor}">${escSim(prefixo)}</span>
        <span class="vp-linha" style="background:${cores.bg};color:${cores.txt}">${escSim(veiculo.linhaAtual || '—')}</span>
        <span class="vp-fase" style="color:${cor}">${fase.toUpperCase()}</span>
      </div>
      <div class="vp-destino">${escSim(destino)}</div>
      <div class="vp-progress-wrap">
        <div class="vp-progress-bar">
          <div class="vp-progress-fill" style="width:${pct}%;background:${cor}"></div>
        </div>
        <div class="vp-progress-info">
          <span>${pct}% do percurso</span>
          <span>${aguardando ? 'parado' : parado ? 'parado' : 'em movimento'}</span>
        </div>
      </div>
      <div class="vp-status" style="border-color:${statusCor}">
        <span class="vp-status-icon">${statusIcon}</span>
        <span class="vp-status-text">${escSim(statusTxt)}</span>
      </div>
      <div class="vp-info">
        <div><span>Partida:</span> <b>${escSim(veiculo.ultimaPartida || '—')}</b></div>
        <div><span>Retorno:</span> <b>${escSim(veiculo.horarioRetorno || '—')}</b></div>
        <div><span>Plataforma:</span> <b>${escSim(veiculo.plataforma || '—')}</b></div>
      </div>
    </div>
  `;
}

/* ---------- Cores / imagem / destino ---------- */
function buscarCoresDaLinha(veiculo) {
  const data = window.vehicleManager?.currentScheduleData || [];
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
  const porLinha = data.find(d => d.line === veiculo.linhaAtual);
  if (porLinha) return {
    bg: porLinha.bgColor || '#334155',
    txt: porLinha.textColor || '#ffffff',
  };
  return { bg: '#334155', txt: '#ffffff' };
}

function destinoDoSentido(veiculo, sentido) {
  const destinoPlanilha = buscarDestinoSim(veiculo.linhaAtual)
    || buscarDestinoPartida(veiculo)
    || '—';
  if (sentido === 'volta') return SIM_CFG.NOME_ORIGEM;
  return destinoPlanilha;
}

function buscarDestinoPartida(veiculo) {
  const data = window.vehicleManager?.currentScheduleData || [];
  const p = data.find(d =>
    d.vehicle === veiculo.prefixo &&
    d.line === veiculo.linhaAtual &&
    d.time === veiculo.ultimaPartida
  );
  return p?.destination || null;
}

function buscarDestinoSim(linha) {
  if (!SimState.tracados?.linhas) return '';
  const l = SimState.tracados.linhas.find(x => x.linha === linha);
  return l?.nome || '';
}

const MODELO_ALIASES = {
  'MILLENNIUM 4': 'M4', 'MILLENNIUM4': 'M4', 'MILLENNIUM-4': 'M4', 'M4': 'M4',
  'MILLENNIUM 5': 'M5', 'MILLENNIUM5': 'M5', 'MILLENNIUM-5': 'M5', 'M5': 'M5',
  'BRT II': 'BRTII', 'BRTII': 'BRTII', 'BRT-2': 'BRTII', 'BRT 2': 'BRTII',
  'MILLENNIUM BRT II 23M': 'BRTII', 'MILLENNIUM BRTII 23M': 'BRTII',
  'MILLENNIUM BRT II': 'BRTII', 'MILLENNIUM BRTII': 'BRTII', 'BRT II 23M': 'BRTII',
};

const TIPO_ALIASES = {
  'PADRON': 'PADRON', 'PADRÃO': 'PADRON', 'PADRAO': 'PADRON',
  'ARTICULADO': 'ARTICULADO',
  'SUPERARTICULADO': 'SUPERARTICULADO', 'SUPER ARTICULADO': 'SUPERARTICULADO',
};

function normalizar(valor, aliases) {
  const v = String(valor || '').toUpperCase().trim();
  if (aliases[v]) return aliases[v];
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
  const arquivo = `${modelo}-${tipo}-${s}.jpg`;
  return `img/vehicles/${encodeURIComponent(arquivo)}`;
}

function placeholderImg(veiculo) {
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