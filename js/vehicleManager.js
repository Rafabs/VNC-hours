class VehicleManager {
  constructor() {
    this.vehicles = new Map();
    this.garagemFilter = "VILA NOVA CACHOEIRINHA";
    this.vehicleStatus = {
      "EM VIAGEM": {
        color: "#28a745",
        text: "EM VIAGEM",
        en: "IN TRIP",
        category: "viagem",
      },
      "ALINHANDO NA PLATAFORMA": {
        color: "#17a2b8",
        text: "ALINHANDO NA PLATAFORMA",
        en: "ALIGNING AT PLATFORM",
        category: "alinhando",
      },
      "NA PLATAFORMA": {
        color: "#ff6b00",
        text: "NA PLATAFORMA",
        en: "AT PLATFORM",
        category: "plataforma",
      },
      AGUARDANDO: {
        color: "#6f42c1",
        text: "AGUARDANDO",
        en: "AWAITING",
        category: "aguardando",
      },
      RESERVA: {
        color: "#ffc107",
        text: "RESERVA",
        en: "RESERVE",
        category: "reserva",
      },
      "EM MANUTENÇÃO": {
        color: "#dc3545",
        text: "EM MANUTENÇÃO",
        en: "IN MAINTENANCE",
        category: "manutencao",
      },
    };
    this.currentScheduleData = []; // Armazenar dados do horário ativo
    this.updateInterval = null;
    this.isUpdating = false;
  }

  // ✅ MÉTODO PARA INICIAR ATUALIZAÇÃO AUTOMÁTICA
  startAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Atualizar veículos a cada 2 segundos (mais frequente que o schedule)
    this.updateInterval = setInterval(() => {
      if (!this.isUpdating && this.currentScheduleData.length > 0) {
        this.isUpdating = true;

        try {
          // Fazer uma cópia dos dados atuais para comparar depois
          const vehiclesBefore = Array.from(this.vehicles.values()).map(
            (v) => ({
              prefixo: v.prefixo,
              status: v.status,
              categoria: v.categoria,
            }),
          );

          // Atualizar veículos
          this.updateVehicleWithSchedule();

          // Verificar se houve mudanças
          const vehiclesAfter = Array.from(this.vehicles.values()).map((v) => ({
            prefixo: v.prefixo,
            status: v.status,
            categoria: v.categoria,
          }));

          // Disparar evento se houver mudanças
          if (
            JSON.stringify(vehiclesBefore) !== JSON.stringify(vehiclesAfter)
          ) {
            this.triggerVehicleUpdate();
          }
        } catch (error) {
          console.error("Erro na atualização automática de veículos:", error);
        } finally {
          this.isUpdating = false;
        }
      }
    }, 2000);
  }

  // ✅ MÉTODO PARA DISPARAR EVENTO DE ATUALIZAÇÃO
  triggerVehicleUpdate() {
    const stats = this.getFleetStatistics();
    const event = new CustomEvent("vehiclesUpdated", {
      detail: {
        statistics: stats,
        timestamp: new Date(),
      },
    });
    document.dispatchEvent(event);
    console.log("🚌 Veículos atualizados e evento disparado");
  }

  // ✅ MÉTODO PARA PARAR ATUALIZAÇÕES
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Carregar dados dos veículos
  async loadVehicleData() {
    try {
      const response = await fetch("./data/vehicles.json");
      if (!response.ok) {
        throw new Error("Erro ao carregar dados dos veículos");
      }

      const jsonData = await response.json();
      this.vehicles = this.filterAndParseVehicles(jsonData);
      console.log(
        "Dados dos veículos carregados:",
        this.vehicles.size,
        "veículos da VNC",
      );
      return this.vehicles;
    } catch (error) {
      console.error("Erro ao carregar veículos:", error);
      return new Map();
    }
  }

  // Definir dados do horário ativo
  setCurrentScheduleData(scheduleData) {
    this.currentScheduleData = scheduleData || [];
    console.log(
      "Dados de horário definidos para frota:",
      this.currentScheduleData.length,
      "partidas",
    );
  }

  // Filtrar veículos da VNC e converter para Map
  filterAndParseVehicles(jsonData) {
    const vehicles = new Map();

    jsonData.forEach((vehicle) => {
      // Filtrar apenas veículos da VNC em operação
      if (
        vehicle.GARAGEM === this.garagemFilter &&
        vehicle.STATUS_OP === "EM OPERAÇÃO"
      ) {
        const vehicleData = {
          prefixo: vehicle.PREFIXO,
          modelo: vehicle.MODELO,
          tipo: vehicle.TIPO,
          portasLE: vehicle.PORTAS_LE,
          portasLD: vehicle.PORTAS_LD,
          placa: vehicle.PLACA,
          status: "AGUARDANDO",
          garagem: vehicle.GARAGEM,
          linhaAtual: "",
          plataforma: "",
          proximaViagem: null,
          ultimaPartida: null,
          tempoViagem: null,
          categoria: "aguardando",
        };

        vehicles.set(vehicle.PREFIXO, vehicleData);
      }
    });

    return vehicles;
  }

  // Atualizar veículo com informações dos horários ATUAIS
  updateVehicleWithSchedule() {
    if (!this.currentScheduleData || this.currentScheduleData.length === 0) {
      console.warn("Nenhum dado de horário disponível para atualizar frota");
      return;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const previouslyInTrip = new Set();
    this.vehicles.forEach((vehicle) => {
      if (vehicle.status === "EM VIAGEM") {
        previouslyInTrip.add(vehicle.prefixo);
      }
    });

    // Resetar status APENAS para veículos que não estão em viagem
    this.vehicles.forEach((vehicle) => {
      // ✅ NÃO resetar veículos que estão EM VIAGEM - preservar status atual
      if (vehicle.status !== "EM VIAGEM") {
        vehicle.status = "AGUARDANDO";
        vehicle.linhaAtual = "";
        vehicle.plataforma = "";
        vehicle.proximaViagem = null;
        vehicle.ultimaPartida = null;
        vehicle.horarioRetorno = null;
        vehicle.tempoAteRetorno = null;
        vehicle.duracaoViagem = null;
        vehicle.categoria = "aguardando";
      }
    });

    // Processar cada partida do horário ATUAL
    this.currentScheduleData.forEach((departure) => {
      const [hours, minutes] = departure.time.split(":").map(Number);
      const departureTime = hours * 60 + minutes;
      const minutesUntil = departureTime - currentTime;
      const duracaoViagem = departure.duracao || 90; // Tempo TOTAL de rodagem (ida + volta)

      const retornoTime = departureTime + duracaoViagem;
      const metadeViagem = departureTime + Math.floor(duracaoViagem / 2); // ✅ 50% da viagem

      const vehicle = this.vehicles.get(departure.vehicle);
      if (vehicle) {
        if (minutesUntil <= 0 && currentTime <= retornoTime) {
          vehicle.status = "EM VIAGEM";
          vehicle.linhaAtual = departure.line;
          vehicle.plataforma = departure.platform;
          vehicle.ultimaPartida = departure.time;
          vehicle.horarioRetorno = this.formatTimeFromMinutes(retornoTime);
          vehicle.tempoAteRetorno = retornoTime - currentTime;
          vehicle.duracaoViagem = duracaoViagem;
          vehicle.categoria = "viagem";

          vehicle.proximaViagem = this.findNextTrip(
            vehicle.prefixo,
            this.currentScheduleData,
            currentTime,
          );
        } else if (currentTime > retornoTime) {
          // Buscar próxima viagem
          vehicle.proximaViagem = this.findNextTrip(
            vehicle.prefixo,
            this.currentScheduleData,
            currentTime,
          );

          // Se tem próxima viagem em breve, preparar status
          if (vehicle.proximaViagem) {
            const [proxHours, proxMinutes] = vehicle.proximaViagem
              .split(":")
              .map(Number);
            const proxTime = proxHours * 60 + proxMinutes;
            const minutosAteProxima = proxTime - currentTime;

            // Só preenche linha e plataforma se tiver próxima viagem em breve
            if (minutosAteProxima <= 240) {
              vehicle.linhaAtual = departure.line;
              vehicle.plataforma = departure.platform;

              // Status específicos para próxima partida
              if (minutosAteProxima <= 5 && minutosAteProxima >= 0) {
                vehicle.status = "NA PLATAFORMA";
                vehicle.categoria = "plataforma";
              } else if (minutosAteProxima <= 7 && minutosAteProxima >= 6) {
                vehicle.status = "ALINHANDO NA PLATAFORMA";
                vehicle.categoria = "alinhando";
              } else if (minutosAteProxima <= 16 && minutosAteProxima >= 7) {
                vehicle.status = "AGUARDANDO";
                vehicle.categoria = "aguardando";
              }
            } else {
              // Próxima viagem está longe, fica como RESERVA
              vehicle.status = "RESERVA";
              vehicle.categoria = "reserva";
              vehicle.linhaAtual = "";
              vehicle.plataforma = "";
            }
          } else {
            // Não tem próxima viagem, fica como RESERVA
            vehicle.status = "RESERVA";
            vehicle.categoria = "reserva";
            vehicle.linhaAtual = "";
            vehicle.plataforma = "";
          }
        }
        // Status específicos para próxima partida (quando ainda não partiu)
        else if (minutesUntil <= 5 && minutesUntil >= 0) {
          vehicle.status = "NA PLATAFORMA";
          vehicle.linhaAtual = departure.line;
          vehicle.plataforma = departure.platform;
          vehicle.proximaViagem = departure.time;
          vehicle.duracaoViagem = duracaoViagem;
          vehicle.categoria = "plataforma";
        } else if (minutesUntil <= 7 && minutesUntil >= 6) {
          vehicle.status = "ALINHANDO NA PLATAFORMA";
          vehicle.linhaAtual = departure.line;
          vehicle.plataforma = departure.platform;
          vehicle.proximaViagem = departure.time;
          vehicle.duracaoViagem = duracaoViagem;
          vehicle.categoria = "alinhando";
        } else if (minutesUntil <= 16 && minutesUntil >= 7) {
          vehicle.status = "AGUARDANDO";
          vehicle.linhaAtual = departure.line;
          vehicle.plataforma = departure.platform;
          vehicle.proximaViagem = departure.time;
          vehicle.duracaoViagem = duracaoViagem;
          vehicle.categoria = "aguardando";
        }
      }
    });

    // Veículos que não estão no horário atual são RESERVA
    this.vehicles.forEach((vehicle) => {
      if (vehicle.status === "AGUARDANDO" && !vehicle.linhaAtual) {
        vehicle.status = "RESERVA";
        vehicle.categoria = "reserva";
      }
      const nowInTrip = new Set();
      this.vehicles.forEach((vehicle) => {
        if (vehicle.status === "EM VIAGEM") {
          nowInTrip.add(vehicle.prefixo);
        }
      });

      // Veículos que ESTAVAM em viagem mas AGORA NÃO estão mais
      const finishedTrips = Array.from(previouslyInTrip).filter(
        (prefix) => !nowInTrip.has(prefix),
      );

      if (finishedTrips.length > 0) {
        console.log(
          `🎯 Veículos que terminaram viagem: ${finishedTrips.join(", ")}`,
        );

        // Disparar evento personalizado para notificar outros componentes
        finishedTrips.forEach((prefix) => {
          const event = new CustomEvent("vehicleTripFinished", {
            detail: { prefixo: prefix },
          });
          document.dispatchEvent(event);
        });
      }
    });
  }

  // Buscar veículos por prefixo, placa ou linha
  searchVehicles(searchTerm) {
    if (!searchTerm || searchTerm.trim() === "") {
      return Array.from(this.vehicles.values());
    }

    const term = searchTerm.toLowerCase().trim();
    const results = [];

    this.vehicles.forEach((vehicle) => {
      if (
        vehicle.prefixo.toLowerCase().includes(term) ||
        vehicle.placa.toLowerCase().includes(term) ||
        vehicle.linhaAtual.toLowerCase().includes(term) ||
        vehicle.modelo.toLowerCase().includes(term)
      ) {
        results.push(vehicle);
      }
    });

    return results;
  }

  // Converter minutos para formato HH:MM
  formatTimeFromMinutes(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}`;
  }

  // Calcular tempo até o retorno formatado
  getTempoAteRetornoFormatado(tempoAteRetorno) {
    if (tempoAteRetorno === null || tempoAteRetorno <= 0) return "CHEGOU";

    if (tempoAteRetorno < 60) {
      return `${tempoAteRetorno} min`;
    } else {
      const hours = Math.floor(tempoAteRetorno / 60);
      const minutes = tempoAteRetorno % 60;
      return `${hours}h${minutes > 0 ? `${minutes}min` : ""}`;
    }
  }

  // Encontrar próxima viagem do veículo
  findNextTrip(vehiclePrefix, scheduleData, currentTime) {
    let nextTrip = null;
    let minTimeDiff = Infinity;

    scheduleData.forEach((departure) => {
      if (departure.vehicle === vehiclePrefix) {
        const [hours, minutes] = departure.time.split(":").map(Number);
        const departureTime = hours * 60 + minutes;
        const timeDiff = departureTime - currentTime;

        // Encontrar a próxima viagem mais próxima no futuro
        if (timeDiff > 0 && timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          nextTrip = departure.time;
        }
      }
    });

    return nextTrip;
  }

  // Obter texto do status com plataforma quando aplicável
  getStatusDisplayText(vehicle, language = "pt") {
    const statusInfo = this.vehicleStatus[vehicle.status];
    let text = language === "pt" ? statusInfo.text : statusInfo.en;

    // Adicionar número da plataforma quando aplicável
    if (
      (vehicle.categoria === "plataforma" ||
        vehicle.categoria === "alinhando") &&
      vehicle.plataforma
    ) {
      text += ` ${vehicle.plataforma}`;
    }

    return text;
  }

  // Obter veículos por categoria
  getVehiclesByCategory(categoria) {
    const result = [];
    this.vehicles.forEach((vehicle) => {
      if (vehicle.categoria === categoria) {
        result.push(vehicle);
      }
    });
    return result;
  }

  // Obter veículos em viagem
  getVehiclesEmViagem() {
    return this.getVehiclesByCategory("viagem");
  }

  // Obter veículos na plataforma
  getVehiclesNaPlataforma() {
    return this.getVehiclesByCategory("plataforma");
  }

  // Obter veículos alinhando
  getVehiclesAlinhando() {
    return this.getVehiclesByCategory("alinhando");
  }

  // Obter veículos aguardando
  getVehiclesAguardando() {
    return this.getVehiclesByCategory("aguardando");
  }

  // Obter veículos reserva
  getVehiclesReserva() {
    return this.getVehiclesByCategory("reserva");
  }

  // Obter estatísticas
  getFleetStatistics() {
    const stats = {
      total: this.vehicles.size,
      em_viagem: this.getVehiclesEmViagem().length,
      na_plataforma: this.getVehiclesNaPlataforma().length,
      alinhando: this.getVehiclesAlinhando().length,
      aguardando: this.getVehiclesAguardando().length,
      reserva: this.getVehiclesReserva().length,
    };
    return stats;
  }

  // Obter status formatado para exibição
  getStatusInfo(status, language = "pt") {
    const statusInfo =
      this.vehicleStatus[status] || this.vehicleStatus["AGUARDANDO"];
    return {
      color: statusInfo.color,
      text: language === "pt" ? statusInfo.text : statusInfo.en,
      category: statusInfo.category,
    };
  }

  // Calcular tempo decorrido desde a partida
  getTempoDecorrido(ultimaPartida) {
    if (!ultimaPartida) return null;

    const now = new Date();
    const [hours, minutes] = ultimaPartida.split(":").map(Number);
    const partidaTime = new Date();
    partidaTime.setHours(hours, minutes, 0, 0);

    const diffMs = now - partidaTime;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 0) return "0 min";
    return `${diffMinutes} min`;
  }

  // Calcular minutos até a partida
  getMinutosAtePartida(proximaViagem) {
    if (!proximaViagem) return null;

    const now = new Date();
    const [hours, minutes] = proximaViagem.split(":").map(Number);
    const partidaTime = new Date();
    partidaTime.setHours(hours, minutes, 0, 0);

    const diffMs = partidaTime - now;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    return Math.max(0, diffMinutes);
  }

  // Obter veículos que estão retornando em breve (com melhor lógica)
  getVehiclesRetornando() {
    const result = [];
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    this.vehicles.forEach((vehicle) => {
      if (vehicle.categoria === "viagem" && vehicle.ultimaPartida) {
        const [hours, minutes] = vehicle.ultimaPartida.split(":").map(Number);
        const partidaTime = hours * 60 + minutes;
        const duracaoTotal = vehicle.duracaoViagem || 90;
        const metadeViagem = partidaTime + Math.floor(duracaoTotal / 2);
        const tempoRestante = vehicle.tempoAteRetorno;

        // ✅ CONSIDERAR "RETORNANDO" quando está na segunda metade da viagem
        // Ex: Viagem de 64 min → Aos 32 min já está retornando
        if (currentTime >= metadeViagem && tempoRestante > 0) {
          result.push(vehicle);
        }
      }
    });

    return result.sort((a, b) => a.tempoAteRetorno - b.tempoAteRetorno);
  }

  // Adicionar método para obter horários do veículo
  getVehicleSchedule(vehiclePrefix, scheduleData) {
    return scheduleData
      .filter((departure) => departure.vehicle === vehiclePrefix)
      .sort((a, b) => {
        const [aHours, aMinutes] = a.time.split(":").map(Number);
        const [bHours, bMinutes] = b.time.split(":").map(Number);
        return aHours * 60 + aMinutes - (bHours * 60 + bMinutes);
      });
  }

  // Obter estatísticas do veículo
  getVehicleStats(vehiclePrefix, scheduleData) {
    const vehicleSchedule = this.getVehicleSchedule(
      vehiclePrefix,
      scheduleData,
    );
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const completedTrips = vehicleSchedule.filter((departure) => {
      const [hours, minutes] = departure.time.split(":").map(Number);
      const departureTime = hours * 60 + minutes;
      const retornoTime = departureTime + (departure.duracao || 45);
      return currentTime > retornoTime;
    }).length;

    const pendingTrips = vehicleSchedule.filter((departure) => {
      const [hours, minutes] = departure.time.split(":").map(Number);
      const departureTime = hours * 60 + minutes;
      return currentTime <= departureTime;
    }).length;

    return {
      totalTrips: vehicleSchedule.length,
      completedTrips,
      pendingTrips,
      vehicleSchedule,
    };
  }

  // Obter estatísticas do veículo para múltiplos dias (APENAS se existir arquivo JSON)
  async getVehicleMultiDayStats(vehiclePrefix, scheduleManager, days = 7) {
    if (!scheduleManager) {
      console.error("ScheduleManager não fornecido");
      return { totalDays: 0, days: [] };
    }

    try {
      const daysStats = [];
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      // Gerar as datas para os próximos dias
      const nextDays = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateISO = date.toISOString().split("T")[0];

        // Formatação para exibição (Ex: "Seg, 20/05")
        const display =
          i === 0
            ? "Hoje"
            : date.toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
              });

        nextDays.push({ date: dateISO, display: display });
      }

      // Processar cada dia individualmente buscando o arquivo físico
      for (const day of nextDays) {
        // O loadScheduleForDate no CSVLoader deve retornar null se o fetch falhar (404)
        const daySchedules =
          await scheduleManager.csvLoader.loadScheduleForDate(day.date);

        // ✅ REGRA: Só processa se o arquivo .json existir e tiver dados
        if (
          daySchedules &&
          Array.isArray(daySchedules) &&
          daySchedules.length > 0
        ) {
          const vehicleSchedule = daySchedules.filter(
            (departure) => departure.vehicle === vehiclePrefix,
          );

          // Só adicionamos o dia à lista se o veículo específico tiver viagens escaladas
          if (vehicleSchedule.length > 0) {
            const isToday = day.date === now.toISOString().split("T")[0];
            let completed = 0;
            let pending = 0;
            let inProgress = 0;

            vehicleSchedule.forEach((departure) => {
              const [h, m] = departure.time.split(":").map(Number);
              const depTime = h * 60 + m;
              const duracao = departure.duracao || 45;
              const retornoTime = depTime + duracao;

              if (!isToday || currentTime > retornoTime) {
                completed++;
              } else if (
                isToday &&
                currentTime >= depTime &&
                currentTime <= retornoTime
              ) {
                inProgress++;
              } else {
                pending++;
              }
            });

            daysStats.push({
              date: day.date,
              dateDisplay: day.display,
              totalTrips: vehicleSchedule.length,
              completedTrips: completed,
              inProgressTrips: inProgress,
              pendingTrips: pending,
              schedules: vehicleSchedule.sort((a, b) =>
                a.time.localeCompare(b.time),
              ),
            });
          }
        } else {
          console.log(
            `ℹ️ Pulando dia ${day.date}: Arquivo JSON não encontrado ou vazio.`,
          );
        }
      }

      return {
        totalDays: daysStats.length,
        days: daysStats,
      };
    } catch (error) {
      console.error(
        "Erro crítico ao obter estatísticas de múltiplos dias:",
        error,
      );
      return { totalDays: 0, days: [] };
    }
  } // <-- Adicionado fechamento do método getVehicleMultiDayStats

  // ✅ MÉTODO PARA OBSERVAR MUDANÇAS NOS VEÍCULOS
  startStatusMonitoring() {
    console.log('👀 Iniciando monitoramento de status dos veículos...');
    
    // Monitorar a cada 2 segundos
    setInterval(() => {
      this.checkForStatusChanges();
    }, 2000);
  }

  // ✅ MÉTODO PARA VERIFICAR MUDANÇAS DE STATUS
  checkForStatusChanges() {
    if (!this.currentScheduleData || this.currentScheduleData.length === 0) {
      return;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Fazer uma cópia dos status atuais
    const previousStatuses = new Map();
    this.vehicles.forEach((vehicle, prefixo) => {
      previousStatuses.set(prefixo, {
        status: vehicle.status,
        categoria: vehicle.categoria,
        linhaAtual: vehicle.linhaAtual,
        plataforma: vehicle.plataforma
      });
    });

    // Atualizar status
    this.updateVehicleWithSchedule();

    // Verificar quais veículos mudaram
    const changedVehicles = [];
    this.vehicles.forEach((vehicle, prefixo) => {
      const previous = previousStatuses.get(prefixo);
      if (previous && (
        previous.status !== vehicle.status ||
        previous.categoria !== vehicle.categoria ||
        previous.linhaAtual !== vehicle.linhaAtual ||
        previous.plataforma !== vehicle.plataforma
      )) {
        changedVehicles.push({
          prefixo: prefixo,
          oldStatus: previous.status,
          newStatus: vehicle.status,
          oldCategoria: previous.categoria,
          newCategoria: vehicle.categoria
        });
      }
    });

    // Disparar evento se houver mudanças
    if (changedVehicles.length > 0) {
      console.log(`🔄 ${changedVehicles.length} veículos mudaram de status:`, changedVehicles);
      
      const event = new CustomEvent('vehicleStatusesChanged', {
        detail: {
          changedVehicles: changedVehicles,
          timestamp: now
        }
      });
      document.dispatchEvent(event);
    }
  }
}