class ScheduleManager {
  constructor() {
    this.config = {
      immediateThreshold: 4, // minutos para considerar "embarque imediato"
      confirmedThreshold: 6, // minutos para considerar "confirmado"
      updateInterval: 10000, // intervalo de atualização em milissegundos
      language: "pt", // idioma inicial
    };

    this.csvLoader = new CSVLoader();
    this.scheduleData = [];
  }

  // Carregar dados dos CSVs
  async loadScheduleData(fileSelection = null) {
    try {
      const csvData = await this.csvLoader.loadCSVData(fileSelection);
      this.scheduleData = this.csvLoader.getFormattedData();
      console.log(
        "Dados de partidas carregados:",
        this.scheduleData.length,
        "registros"
      );
      return this.scheduleData;
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      // Em caso de erro, usar dados de fallback
      this.scheduleData = this.getFallbackData();
      return this.scheduleData;
    }
  }

  // Carregar arquivo específico
  async loadSelectedFile(fileSelection) {
    return await this.loadScheduleData(fileSelection);
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

  // Calcular minutos até a partida
  minutesUntilDeparture(departureTime) {
    const now = new Date();
    const [hours, minutes] = departureTime.split(":").map(Number);
    const departureDate = new Date();
    departureDate.setHours(hours, minutes, 0, 0);

    // Se o horário já passou hoje, considerar para amanhã
    if (departureDate < now) {
      departureDate.setDate(departureDate.getDate() + 1);
    }

    return Math.floor((departureDate - now) / (1000 * 60));
  }

  // Obter TODAS as partidas futuras (incluindo as que já passaram há menos de 1 minuto)
  getAllUpcomingDepartures() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
        
    const filtered = this.scheduleData.filter((departure) => {
      const [hours, minutes] = departure.time.split(':').map(Number);
      const departureTime = hours * 60 + minutes;
      const minutesUntil = this.minutesUntilDeparture(departure.time);

      // Incluir partidas que ainda não ocorreram OU que ocorreram há menos de 1 minuto
      return minutesUntil >= -1;
    });
    
    console.log(`📋 Partidas futuras: ${filtered.length} de ${this.scheduleData.length}`);
    return filtered;
  }

  // Obter as próximas X partidas a partir do horário atual
  getNextDepartures(limit = 10) {
    const allDepartures = this.getAllUpcomingDepartures();

    // Ordenar por horário mais próximo
    const sortedDepartures = allDepartures.sort((a, b) => {
      const minutesA = this.minutesUntilDeparture(a.time);
      const minutesB = this.minutesUntilDeparture(b.time);
      return minutesA - minutesB;
    });

    // Retornar apenas as próximas X partidas
    return sortedDepartures.slice(0, limit);
  }

  // Obter todas as partidas restantes (para scroll)
  getRemainingDepartures(limit = 10) {
    const allDepartures = this.getAllUpcomingDepartures();

    // Ordenar por horário mais próximo
    const sortedDepartures = allDepartures.sort((a, b) => {
      const minutesA = this.minutesUntilDeparture(a.time);
      const minutesB = this.minutesUntilDeparture(b.time);
      return minutesA - minutesB;
    });

    // Retornar todas as partidas a partir da posição X
    return sortedDepartures;
  }

  // Verificar status da partida
  getDepartureStatus(departureTime) {
    const minutesUntil = this.minutesUntilDeparture(departureTime);

    if (minutesUntil < 0) {
      return "departed"; // Já partiu
    } else if (minutesUntil <= this.config.immediateThreshold) {
      return "immediate"; // Embarque imediato (0-4 minutos)
    } else if (minutesUntil <= this.config.confirmedThreshold) {
      return "confirmed"; // Confirmado (5-6 minutos)
    } else {
      return "scheduled"; // Previsto (7+ minutos)
    }
  }

  calcularHorarioRetorno(partida, duracao) {
    const [hours, minutes] = partida.split(":").map(Number);
    const partidaDate = new Date();
    partidaDate.setHours(hours, minutes, 0, 0);

    const retornoDate = new Date(partidaDate.getTime() + duracao * 60000);

    return `${String(retornoDate.getHours()).padStart(2, "0")}:${String(
      retornoDate.getMinutes()
    ).padStart(2, "0")}`;
  }

  // Obter duração da viagem por linha/veículo
  getDuracaoViagem(departure) {
    return departure.duracao || 45; // Default 45 minutos
  }

  // Calcular tempo até o retorno do veículo
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

  // Verificar se veículo está em viagem
  isVeiculoEmViagem(departure) {
    const now = new Date();
    const [hours, minutes] = departure.time.split(":").map(Number);
    const partidaDate = new Date();
    partidaDate.setHours(hours, minutes, 0, 0);

    const duracao = this.getDuracaoViagem(departure);
    const retornoDate = new Date(partidaDate.getTime() + duracao * 60000);

    return now >= partidaDate && now <= retornoDate;
  }

  // Obter próximos retornos de veículos
  getProximosRetornos(limit = 10) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const retornos = this.scheduleData
      .filter((departure) => {
        const [hours, minutes] = departure.time.split(":").map(Number);
        const partidaTime = hours * 60 + minutes;
        const duracao = this.getDuracaoViagem(departure);
        const retornoTime = partidaTime + duracao;

        return retornoTime >= currentTime && retornoTime <= currentTime + 120; // Próximas 2 horas
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

  // Obter o nome do arquivo CSV atual
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

  // Verificar se a operação está encerrada para uma linha específica
  isLineOperationEnded(line) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Se for antes das 04:30, considerar operação do dia anterior encerrada
    if (currentTime < 4 * 60 + 30) {
      return true; // Operação encerrada até 04:30
    }

    // Buscar todas as partidas da linha
    const lineDepartures = this.scheduleData.filter(
      (departure) => departure.line === line
    );

    if (lineDepartures.length === 0) return false;

    // Encontrar última partida da linha
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

    // Considerar operação encerrada 30 minutos após o retorno da última viagem
    const operationEndTime = lastDepartureTime + duracao + 30;

    return currentTime > operationEndTime;
  }

  // Obter status da operação por linha
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

  // Obter partidas filtradas por operação (exclui linhas encerradas)
  getFilteredDepartures() {
    const allDepartures = this.getAllUpcomingDepartures();

    // Filtrar partidas de linhas que ainda estão em operação
    return allDepartures.filter((departure) => {
      return !this.isLineOperationEnded(departure.line);
    });
  }

  // Obter próximas partidas filtradas
  getFilteredNextDepartures(limit = 10) {
    const filteredDepartures = this.getFilteredDepartures();

    // Ordenar por horário mais próximo
    const sortedDepartures = filteredDepartures.sort((a, b) => {
      const minutesA = this.minutesUntilDeparture(a.time);
      const minutesB = this.minutesUntilDeparture(b.time);
      return minutesA - minutesB;
    });

    return sortedDepartures.slice(0, limit);
  }

}