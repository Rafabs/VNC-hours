/* ============================================================
   tripLogger.js — VNC
   Log estruturado de viagens para análise e ajuste da escala.
   Não altera o comportamento do simulador.
   ============================================================ */

const TripLogger = {
  logs: [],                    // buffer em memória
  maxLogs: 5000,               // limpa antigos depois disso
  gravando: true,

  // Registra um evento de viagem completa
  registrarViagem(veiculo, detalhes) {
    if (!this.gravando) return;

    const log = {
      ts: new Date().toISOString(),
      prefixo: veiculo.prefixo,
      linha: veiculo.linhaAtual,
      plataforma: veiculo.plataforma,
      // tempos (em minutos, formato HH:MM)
      partida: veiculo.ultimaPartida,
      chegadaTerminal: detalhes.chegadaTerminal,
      paradaTerminalMin: detalhes.paradaTerminalMin,
      saidaTerminal: detalhes.saidaTerminal,
      chegadaVNC: detalhes.chegadaVNC,
      // próxima viagem
      proximaViagem: detalhes.proximaViagem || null,
      diferencaMin: detalhes.diferencaMin,       // próximaViagem - chegadaVNC
      // veredito
      status: detalhes.status,                   // 'ok' | 'ajustar' | 'recolher'
      sugestao: detalhes.sugestao,               // texto legível
      duracaoTotal: veiculo.duracaoViagem,
      tempoParadaTerminal: veiculo.tempoParadaTerminal || null,
      // debug — opcional
      _doDiaAnterior: detalhes._doDiaAnterior || false,
    };

    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console (truncado pra não poluir)
    console.log(
      `[LOG] ${log.prefixo} - ${log.linha} - ${log.partida} - ` +
      `chegou ${log.chegadaVNC} - próxima ${log.proximaViagem || '—'} - ` +
      `dif ${log.diferencaMin != null ? log.diferencaMin + 'min' : 'N/A'} - ` +
      `${log.status.toUpperCase()}${log.sugestao ? ' (' + log.sugestao + ')' : ''}`
    );

    // Dispara evento pra UI ouvir (opcional)
    document.dispatchEvent(new CustomEvent('tripLogAdded', { detail: log }));
  },

  // Exporta o log pra arquivo .json (baixa)
  exportar() {
    const payload = {
      exportado_em: new Date().toISOString(),
      total: this.logs.length,
      logs: this.logs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trip-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    console.log(`[LOG] ${this.logs.length} registros exportados`);
  },

  // Exporta em CSV (mais fácil de abrir no Excel)
  exportarCSV() {
    const header = [
      'timestamp', 'prefixo', 'linha', 'plataforma',
      'partida', 'chegada_terminal', 'parada_terminal_min',
      'saida_terminal', 'chegada_vnc',
      'proxima_viagem', 'diferenca_min', 'status', 'sugestao',
      'duracao_total_min', 'parada_configurada', 'do_dia_anterior',
    ];
    const linhas = this.logs.map(l => [
      l.ts, l.prefixo, l.linha, l.plataforma,
      l.partida, l.chegadaTerminal, l.paradaTerminalMin,
      l.saidaTerminal, l.chegadaVNC,
      l.proximaViagem || '', l.diferencaMin ?? '',
      l.status, l.sugestao || '',
      l.duracaoTotal, l.tempoParadaTerminal ?? '',
      l._doDiaAnterior ? 'sim' : 'não',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...linhas].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trip-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  // Limpa o buffer
  limpar() {
    this.logs = [];
    console.log('[LOG] buffer limpo');
  },

  // Estatísticas agregadas
  resumo() {
    const total = this.logs.length;
    const porStatus = { ok: 0, ajustar: 0, recolher: 0 };
    let somaDif = 0;
    let countDif = 0;

    for (const l of this.logs) {
      porStatus[l.status] = (porStatus[l.status] || 0) + 1;
      if (l.diferencaMin != null) {
        somaDif += l.diferencaMin;
        countDif++;
      }
    }

    const media = countDif > 0 ? (somaDif / countDif).toFixed(1) : '—';

    console.log(
      `[LOG] ${total} viagens | ` +
      `OK: ${porStatus.ok} | ` +
      `Ajustar: ${porStatus.ajustar} | ` +
      `Recolher: ${porStatus.recolher} | ` +
      `Diferença média: ${media} min`
    );
    return { total, porStatus, media };
  },
};