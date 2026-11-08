class ScheduleManager {
  constructor() {
    this.config = {
      immediateThreshold: 4,
      confirmedThreshold: 6,
      updateInterval: 10000,
      language: "pt",
    };

    this.csvLoader = new CSVLoader();
    this.scheduleData = [];
    this.updateInterval = null;
    this.lastUpdateTime = null;
  }

  // ============================================================
  // ROLLOVER DE MEIA-NOITE
  // ============================================================
  async loadScheduleDataWithRollover(fileSelection = null) {
    // 1) Carrega o dia atual via CSVLoader
    await this.csvLoader.loadCSVData(fileSelection);
    this.scheduleData = this.csvLoader.getFormattedData();

    const diaAtual = this.getCurrentDate();
    const diaAnterior = this.dateStrMenosUmDia(diaAtual);

    // 2) Busca partidas do dia anterior (pode retornar null)
    let partidasAnteriores = null;
    try {
      partidasAnteriores = await this.csvLoader.loadScheduleForDate(diaAnterior);
    } catch (e) {
      console.warn('[rollover] erro ao carregar dia anterior:', e);
    }

    if (!Array.isArray(partidasAnteriores) || partidasAnteriores.length === 0) {
      console.log('[rollover] nenhuma partida do dia anterior para reter');
      this.triggerScheduleUpdate();
      return this.scheduleData;
    }

    // 3) Filtra só as que AINDA NÃO retornaram
    const agora = new Date();
    const minAgora = agora.getHours() * 60 + agora.getMinutes();

    const retidas = partidasAnteriores.filter(p => {
      if (!p.time) return false;
      const [h, m] = p.time.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return false;

      const partidaMin = h * 60 + m;
      const retornoMin = partidaMin + (p.duracao || 90);
      const retornoReal = retornoMin >= partidaMin ? retornoMin : retornoMin + 1440;
      return (minAgora + 1440) < retornoReal;
    });

    // 4) Marca origem e concatena SEM duplicar
    const marcadas = retidas.map(p => ({ ...p, _doDiaAnterior: true }));
    const chave = p => `${p.vehicle}|${p.time}|${p.line}`;
    const jaExiste = new Set(this.scheduleData.map(chave));
    const novas = marcadas.filter(p => !jaExiste.has(chave(p)));

    this.scheduleData = [...novas, ...this.scheduleData];

    console.log(
      `[rollover] ${novas.length} partidas do dia ${diaAnterior} retidas ` +
      `(${retidas.length} candidatas, ${retidas.length - novas.length} duplicadas)`
    );

    this.triggerScheduleUpdate();
    return this.scheduleData;
  }

  dateStrMenosUmDia(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  // ✅ MÉTODO PARA INICIAR ATUALIZAÇÃO AUTOMÁTICA
  startAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      try {
        this.triggerScheduleUpdate();
      } catch (error) {
        console.error("Erro na atualização automática:", error);
      }
    }, 5000);
  }

  // ✅ MÉTODO PARA DISPARAR EVENTO DE ATUALIZAÇÃO
  triggerScheduleUpdate() {
    this.lastUpdateTime = new Date();
    const event = new CustomEvent("scheduleUpdated", {
      detail: {
        scheduleData: this.scheduleData,
        timestamp: this.lastUpdateTime,
      },
    });
    document.dispatchEvent(event);
    console.log("📅 Schedule atualizado e evento disparado");
  }

  // ✅ MÉTODO PARA PARAR ATUALIZAÇÕES
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Carregar arquivo específico (compatibilidade)
  async loadSelectedFile(fileSelection) {
    await this.csvLoader.loadCSVData(fileSelection);
    this.scheduleData = this.csvLoader.getFormattedData();
    this.triggerScheduleUpdate();
    return this.scheduleData;
  }

  // Dados de fallback em caso de erro no carregamento
  getFallbackData() {
    return [
      {
        time: "08:00",
        line: "L42-VP2",
        bgColor: "#FFD966",
        textColor: "#000000",
        destination: "ISOLINA MAZZEI (VIA SANTANA)",
        vehicle: "48-02540",
        platform: "2",
      },
      {
        time: "08:15",
        line: "L003/10",
        bgColor: "#806000",
        textColor: "#FFFFFF",
        destination: "VILA RICA",
        vehicle: "P 2034",
        platform: "3",
      },
      {
        time: "08:30",
        line: "L002/10",
        bgColor: "#203764",
        textColor: "#FFFFFF",
        destination: "METRÔ SANTANA",
        vehicle: "P 2030",
        platform: "5",
      },
    ];
  }

  // Alias de compatibilidade — mantém código antigo funcionando
  async loadScheduleData(fileSelection = null) {
    return await this.loadScheduleDataWithRollover(fileSelection);
  }

  // Refresh inteligente dos dados
  async refreshScheduleData(fileSelection = null) {
    try {
      const dadosAntigos = this.scheduleData.length;
      await this.csvLoader.loadCSVData(fileSelection);
      this.scheduleData = this.csvLoader.getFormattedData();
      const dadosNovos = this.scheduleData.length;

      console.log(
        `🔄 Dados atualizados: ${dadosAntigos} → ${dadosNovos} registros`,
      );

      if (dadosAntigos !== dadosNovos) {
        console.log("📈 Mudança detectada nos dados da escala");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Erro no refresh dos dados:", error);
      return false;
    }
  }

  hasNewDepartures() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const novasPartidas = this.scheduleData.filter((departure) => {
      const [hours, minutes] = departure.time.split(":").map(Number);
      const departureTime = hours * 60 + minutes;
      const minutesUntil = departureTime - currentTime;

      return minutesUntil >= 0 && minutesUntil <= 30;
    });

    return novasPartidas.length > 0;
  }

  getScheduleStats() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const stats = {
      total: this.scheduleData.length,
      futuras: 0,
      imediatas: 0,
      confirmadas: 0,
      agendadas: 0,
    };

    this.scheduleData.forEach((departure) => {
      const minutesUntil = this.minutesUntilDeparture(departure.time);
      const status = this.getDepartureStatus(departure.time);

      if (minutesUntil >= 0) {
        stats.futuras++;

        switch (status) {
          case "immediate":
            stats.imediatas++;
            break;
          case "confirmed":
            stats.confirmadas++;
            break;
          case "scheduled":
            stats.agendadas++;
            break;
        }
      }
    });

    return stats;
  }

  minutesUntilDeparture(departureTime) {
    const now = new Date();
    const [hours, minutes] = departureTime.split(":").map(Number);
    const departureDate = new Date();
    departureDate.setHours(hours, minutes, 0, 0);

    if (departureDate < now) {
      departureDate.setDate(departureDate.getDate() + 1);
    }

    return Math.floor((departureDate - now) / (1000 * 60));
  }

  getAllUpcomingDepartures() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const filtered = this.scheduleData.filter((departure) => {
      const [hours, minutes] = departure.time.split(":").map(Number);
      const departureTime = hours * 60 + minutes;
      const minutesUntil = this.minutesUntilDeparture(departure.time);

      return minutesUntil >= -1;
    });

    console.log(
      `📋 Partidas futuras: ${filtered.length} de ${this.scheduleData.length}`,
    );
    return filtered;
  }

  getNextDepartures(limit = 10) {
    const allDepartures = this.getAllUpcomingDepartures();

    const sortedDepartures = allDepartures.sort((a, b) => {
      const minutesA = this.minutesUntilDeparture(a.time);
      const minutesB = this.minutesUntilDeparture(b.time);
      return minutesA - minutesB;
    });

    return sortedDepartures.slice(0, limit);
  }

  getRemainingDepartures(limit = 10) {
    const allDepartures = this.getAllUpcomingDepartures();

    const sortedDepartures = allDepartures.sort((a, b) => {
      const minutesA = this.minutesUntilDeparture(a.time);
      const minutesB = this.minutesUntilDeparture(b.time);
      return minutesA - minutesB;
    });

    return sortedDepartures;
  }

  getDepartureStatus(departureTime) {
    const minutesUntil = this.minutesUntilDeparture(departureTime);

    if (minutesUntil < 0) {
      return "departed";
    } else if (minutesUntil <= this.config.immediateThreshold) {
      return "immediate";
    } else if (minutesUntil <= this.config.confirmedThreshold) {
      return "confirmed";
    } else {
      return "scheduled";
    }
  }

  calcularHorarioRetorno(partida, duracao) {
    const [hours, minutes] = partida.split(":").map(Number);
    const partidaDate = new Date();
    partidaDate.setHours(hours, minutes, 0, 0);

    const retornoDate = new Date(partidaDate.getTime() + duracao * 60000);

    return `${String(retornoDate.getHours()).padStart(2, "0")}:${String(
      retornoDate.getMinutes(),
    ).padStart(2, "0")}`;
  }

  getDuracaoViagem(departure) {
    return departure.duracao || 45;
  }

  getTempoAteRetorno(departure) {
    const now = new Date();
    const [hours, minutes] = departure.time.split(":").map(Number);
    const partidaDate = new Date();
    partidaDate.setHours(hours, minutes, 0, 0);

    const duracao = this.getDuracaoViagem(departure);
    const retornoDate = new Date(partidaDate.getTime() + duracao * 60000);

    const diffMs = retornoDate - now;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    return Math.max(0, diffMinutes);
  }

  isVeiculoEmViagem(departure) {
    const now = new Date();
    const [hours, minutes] = departure.time.split(":").map(Number);
    const partidaDate = new Date();
    partidaDate.setHours(hours, minutes, 0, 0);

    const duracao = this.getDuracaoViagem(departure);
    const retornoDate = new Date(partidaDate.getTime() + duracao * 60000);

    return now >= partidaDate && now <= retornoDate;
  }

  getProximosRetornos(limit = 10) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const retornos = this.scheduleData
      .filter((departure) => {
        const [hours, minutes] = departure.time.split(":").map(Number);
        const partidaTime = hours * 60 + minutes;
        const duracao = this.getDuracaoViagem(departure);
        const retornoTime = partidaTime + duracao;

        return retornoTime >= currentTime && retornoTime <= currentTime + 120;
      })
      .map((departure) => ({
        vehicle: departure.vehicle,
        linha: departure.line,
        partida: departure.time,
        retorno: this.calcularHorarioRetorno(departure.time, departure.duracao),
        tempoAteRetorno: this.getTempoAteRetorno(departure),
        plataforma: departure.platform,
      }))
      .sort((a, b) => a.tempoAteRetorno - b.tempoAteRetorno)
      .slice(0, limit);

    return retornos;
  }

  getCurrentCSVFileName() {
    try {
      if (
        this.csvLoader &&
        typeof this.csvLoader.getCSVFileForToday === "function"
      ) {
        const filePath = this.csvLoader.getCSVFileForToday();
        return filePath ? filePath.split("/").pop() : "dados.csv";
      }
      return "dados.csv";
    } catch (error) {
      console.warn("Erro ao obter nome do arquivo CSV:", error);
      return "dados.csv";
    }
  }

  isLineOperationEnded(line) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    if (currentTime < 4 * 60 + 30) {
      return true;
    }

    const lineDepartures = this.scheduleData.filter(
      (departure) => departure.line === line,
    );

    if (lineDepartures.length === 0) return false;

    const lastDeparture = lineDepartures.reduce((latest, current) => {
      const [latestHours, latestMinutes] = latest.time.split(":").map(Number);
      const [currentHours, currentMinutes] = current.time
        .split(":")
        .map(Number);

      const latestTime = latestHours * 60 + latestMinutes;
      const currentTime = currentHours * 60 + currentMinutes;

      return currentTime > latestTime ? current : latest;
    });

    const [lastHours, lastMinutes] = lastDeparture.time.split(":").map(Number);
    const lastDepartureTime = lastHours * 60 + lastMinutes;
    const duracao = lastDeparture.duracao || 45;

    const operationEndTime = lastDepartureTime + duracao + 1;

    return currentTime > operationEndTime;
  }

  getLineOperationStatus(line) {
    if (this.isLineOperationEnded(line)) {
      return {
        status: "ended",
        message: "OPERAÇÃO ENCERRADA",
        enMessage: "OPERATION ENDED",
      };
    }

    return {
      status: "operating",
      message: "EM OPERAÇÃO",
      enMessage: "IN OPERATION",
    };
  }

  async getVehicleScheduleForMultipleDays(vehiclePrefix, days = 7) {
    try {
      const hoje = new Date();
      const schedules = [];

      for (let i = 0; i < days; i++) {
        const data = new Date(hoje);
        data.setDate(hoje.getDate() + i);

        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const dia = String(data.getDate()).padStart(2, "0");
        const dataStr = `${ano}-${mes}-${dia}`;

        const daySchedule = await this.csvLoader.loadScheduleForDate(dataStr);
        if (!daySchedule) continue;

        const vehicleSchedule = daySchedule
          .filter((departure) => departure.vehicle === vehiclePrefix)
          .map((departure) => ({
            ...departure,
            date: dataStr,
            dateDisplay:
              i === 0 ? "Hoje" : i === 1 ? "Amanhã" : `${dia}/${mes}`,
          }));

        if (vehicleSchedule.length > 0) {
          schedules.push({
            date: dataStr,
            dateDisplay:
              i === 0 ? "Hoje" : i === 1 ? "Amanhã" : `${dia}/${mes}`,
            dayOfWeek: data.getDay(),
            schedules: vehicleSchedule,
          });
        }
      }

      return schedules;
    } catch (error) {
      console.error("Erro ao obter horários para múltiplos dias:", error);
      return [];
    }
  }

  getVehicleSchedule(vehiclePrefix, scheduleData) {
    const filtered = scheduleData.filter(
      (departure) => departure.vehicle === vehiclePrefix,
    );

    return filtered
      .map((departure) => ({
        ...departure,
        date: this.getCurrentDate(),
        dateDisplay: "Hoje",
      }))
      .sort((a, b) => {
        const [aHours, aMinutes] = a.time.split(":").map(Number);
        const [bHours, bMinutes] = b.time.split(":").map(Number);
        return aHours * 60 + aMinutes - (bHours * 60 + bMinutes);
      });
  }

  getCurrentDate() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  getFilteredDepartures() {
    const allDepartures = this.getAllUpcomingDepartures();

    return allDepartures.filter((departure) => {
      return !this.isLineOperationEnded(departure.line);
    });
  }

  getFilteredNextDepartures(limit = 10) {
    const filteredDepartures = this.getFilteredDepartures();

    const sortedDepartures = filteredDepartures.sort((a, b) => {
      const minutesA = this.minutesUntilDeparture(a.time);
      const minutesB = this.minutesUntilDeparture(b.time);
      return minutesA - minutesB;
    });

    return sortedDepartures.slice(0, limit);
  }

  getFilteredRemainingDepartures() {
    const filteredDepartures = this.getFilteredDepartures();

    const sortedDepartures = filteredDepartures.sort((a, b) => {
      const minutesA = this.minutesUntilDeparture(a.time);
      const minutesB = this.minutesUntilDeparture(b.time);
      return minutesA - minutesB;
    });

    return sortedDepartures;
  }

  // ✅ MÉTODO PARA ATUALIZAÇÃO AUTOMÁTICA
  startAutoRefresh() {
    console.log('🔄 Iniciando atualização automática do schedule...');

    setInterval(async () => {
      try {
        console.log('⏰ Atualizando dados do schedule...');

        const previousData = this.scheduleData ? [...this.scheduleData] : [];

        const event = new CustomEvent('scheduleRefreshed', {
          detail: {
            previousCount: previousData.length,
            currentCount: this.scheduleData.length,
            timestamp: new Date()
          }
        });
        document.dispatchEvent(event);

        console.log('✅ Schedule refrescado');

      } catch (error) {
        console.error('❌ Erro ao refrescar schedule:', error);
      }
    }, 30000);
  }
}