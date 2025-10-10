class VehiclesApp {
  constructor() {
    this.vehicleManager = new VehicleManager();
    this.scheduleManager = new ScheduleManager();
    this.initializeElements();
    this.init();
  }

  initializeElements() {
    // Elementos DOM
    this.clockElement = document.getElementById("clock");
    this.dateElement = document.getElementById("date");

    // Elementos de estatísticas
    this.totalVehiclesElement = document.getElementById("totalVehicles");
    this.vehiclesViagemElement = document.getElementById("vehiclesViagem");
    this.vehiclesPlataformaElement =
      document.getElementById("vehiclesPlataforma");
    this.vehiclesAlinhandoElement =
      document.getElementById("vehiclesAlinhando");
    this.vehiclesAguardandoElement =
      document.getElementById("vehiclesAguardando");
    this.vehiclesReservaElement = document.getElementById("vehiclesReserva");

    // Elementos dos grids
    this.viagemVehiclesElement = document.getElementById("viagemVehicles");
    this.plataformaVehiclesElement =
      document.getElementById("plataformaVehicles");
    this.alinhandoVehiclesElement =
      document.getElementById("alinhandoVehicles");
    this.aguardandoVehiclesElement =
      document.getElementById("aguardandoVehicles");
    this.reservaVehiclesElement = document.getElementById("reservaVehicles");

    // Elemento para veículos retornando
    this.retornandoVehiclesElement =
      document.getElementById("retornandoVehicles");
  }

  async init() {
    this.updateClock();

    try {
      // Carregar dados dos veículos
      await this.vehicleManager.loadVehicleData();

      // Carregar horários para atualizar status dos veículos
      await this.scheduleManager.loadScheduleData();

      // Verificar se os dados foram carregados
      if (
        this.scheduleManager.scheduleData &&
        this.scheduleManager.scheduleData.length > 0
      ) {
        this.vehicleManager.updateVehicleWithSchedule(
          this.scheduleManager.scheduleData
        );
      } else {
        console.warn("Nenhum dado de horário carregado, usando dados locais");
      }

      // Atualizar interface
      this.updateStatistics();
      this.updateVehicleDisplays();

      // Atualizar relógio
      setInterval(() => this.updateClock(), 1000);

      // Atualizar dados a cada 30 segundos
      setInterval(() => {
        if (
          this.scheduleManager.scheduleData &&
          this.scheduleManager.scheduleData.length > 0
        ) {
          this.vehicleManager.updateVehicleWithSchedule(
            this.scheduleManager.scheduleData
          );
          this.updateVehicleDisplays();
        }
      }, 10000); // Atualizar a cada 10 segundos para maior precisão
    } catch (error) {
      console.error("Erro na inicialização:", error);
      // Continuar mesmo com erro para mostrar pelo menos os veículos
      this.updateStatistics();
      this.updateVehicleDisplays();
    }
  }

  updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    if (this.clockElement) {
      this.clockElement.textContent = `${hours}:${minutes}:${seconds}`;
    }

    if (this.dateElement) {
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      this.dateElement.textContent = `${day}/${month}/${year}`;
    }
  }

  updateStatistics() {
    const stats = this.vehicleManager.getFleetStatistics();

    if (this.totalVehiclesElement)
      this.totalVehiclesElement.textContent = stats.total;
    if (this.vehiclesViagemElement)
      this.vehiclesViagemElement.textContent = stats.em_viagem;
    if (this.vehiclesPlataformaElement)
      this.vehiclesPlataformaElement.textContent = stats.na_plataforma;
    if (this.vehiclesAlinhandoElement)
      this.vehiclesAlinhandoElement.textContent = stats.alinhando;
    if (this.vehiclesAguardandoElement)
      this.vehiclesAguardandoElement.textContent = stats.aguardando;
    if (this.vehiclesReservaElement)
      this.vehiclesReservaElement.textContent = stats.reserva;
  }

  updateVehicleDisplays() {
    this.updateViagemVehicles();
    this.updateRetornandoVehicles();
    this.updatePlataformaVehicles();
    this.updateAlinhandoVehicles();
    this.updateAguardandoVehicles();
    this.updateReservaVehicles();
    this.updateStatistics();
  }

  updateViagemVehicles() {
    if (!this.viagemVehiclesElement) return;

    const viagemVehicles = this.vehicleManager.getVehiclesEmViagem();
    this.viagemVehiclesElement.innerHTML = "";

    viagemVehicles.forEach((vehicle) => {
      const card = this.createVehicleCard(vehicle);
      this.viagemVehiclesElement.appendChild(card);
    });

    if (viagemVehicles.length === 0) {
      this.viagemVehiclesElement.innerHTML =
        '<div class="no-vehicles">Nenhum veículo em viagem no momento</div>';
    }
  }

  updateRetornandoVehicles() {
    if (!this.retornandoVehiclesElement) return;

    const retornandoVehicles = this.vehicleManager.getVehiclesRetornando();
    this.retornandoVehiclesElement.innerHTML = "";

    retornandoVehicles.forEach((vehicle) => {
      const card = this.createRetornandoVehicleCard(vehicle);
      this.retornandoVehiclesElement.appendChild(card);
    });

    if (retornandoVehicles.length === 0) {
      this.retornandoVehiclesElement.innerHTML =
        '<div class="no-vehicles">Nenhum veículo retornando em breve</div>';
    }
  }

  updatePlataformaVehicles() {
    if (!this.plataformaVehiclesElement) return;

    const plataformaVehicles = this.vehicleManager.getVehiclesNaPlataforma();
    this.plataformaVehiclesElement.innerHTML = "";

    plataformaVehicles.forEach((vehicle) => {
      const card = this.createVehicleCard(vehicle);
      this.plataformaVehiclesElement.appendChild(card);
    });

    if (plataformaVehicles.length === 0) {
      this.plataformaVehiclesElement.innerHTML =
        '<div class="no-vehicles">Nenhum veículo na plataforma no momento</div>';
    }
  }

  updateAlinhandoVehicles() {
    if (!this.alinhandoVehiclesElement) return;

    const alinhandoVehicles = this.vehicleManager.getVehiclesAlinhando();
    this.alinhandoVehiclesElement.innerHTML = "";

    alinhandoVehicles.forEach((vehicle) => {
      const card = this.createVehicleCard(vehicle);
      this.alinhandoVehiclesElement.appendChild(card);
    });

    if (alinhandoVehicles.length === 0) {
      this.alinhandoVehiclesElement.innerHTML =
        '<div class="no-vehicles">Nenhum veículo alinhando no momento</div>';
    }
  }

  updateAguardandoVehicles() {
    if (!this.aguardandoVehiclesElement) return;

    const aguardandoVehicles = this.vehicleManager.getVehiclesAguardando();
    this.aguardandoVehiclesElement.innerHTML = "";

    aguardandoVehicles.forEach((vehicle) => {
      const card = this.createVehicleCard(vehicle);
      this.aguardandoVehiclesElement.appendChild(card);
    });

    if (aguardandoVehicles.length === 0) {
      this.aguardandoVehiclesElement.innerHTML =
        '<div class="no-vehicles">Nenhum veículo aguardando no momento</div>';
    }
  }

  updateReservaVehicles() {
    if (!this.reservaVehiclesElement) return;

    const reservaVehicles = this.vehicleManager.getVehiclesReserva();
    this.reservaVehiclesElement.innerHTML = "";

    reservaVehicles.forEach((vehicle) => {
      const card = this.createVehicleCard(vehicle);
      this.reservaVehiclesElement.appendChild(card);
    });

    if (reservaVehicles.length === 0) {
      this.reservaVehiclesElement.innerHTML =
        '<div class="no-vehicles">Nenhum veículo em reserva no momento</div>';
    }
  }

  createVehicleCard(vehicle) {
    const card = document.createElement("div");
    card.className = "vehicle-card";
    card.addEventListener("click", () => this.showVehicleDetails(vehicle));

    const statusInfo = this.vehicleManager.getStatusInfo(vehicle.status);
    const statusDisplayText = this.vehicleManager.getStatusDisplayText(vehicle);
    const tempoDecorrido = vehicle.ultimaPartida
      ? this.vehicleManager.getTempoDecorrido(vehicle.ultimaPartida)
      : null;
    const minutosAtePartida = vehicle.proximaViagem
      ? this.vehicleManager.getMinutosAtePartida(vehicle.proximaViagem)
      : null;

    card.innerHTML = `
            <div class="vehicle-header">
                <div class="vehicle-prefixo">${vehicle.prefixo}</div>
                <div class="vehicle-placa">${vehicle.placa}</div>
            </div>
            <div class="vehicle-info">
                <div class="vehicle-modelo">${vehicle.modelo}</div>
                <div class="vehicle-tipo">${vehicle.tipo}</div>
            </div>
            <div class="vehicle-status">
                <div class="status-badge status-${statusInfo.category}">
                    ${statusDisplayText}
                </div>
                ${
                  vehicle.linhaAtual
                    ? `<div class="linha-info">${vehicle.linhaAtual}</div>`
                    : ""
                }
            </div>
            ${
              vehicle.ultimaPartida
                ? `<div class="viagem-info">
                    <div class="partida">Partiu: ${vehicle.ultimaPartida}</div>
                    <div class="tempo-decorrido">⏱️ ${tempoDecorrido}</div>
                </div>`
                : ""
            }
            ${
              vehicle.proximaViagem
                ? `<div class="proxima-viagem">
                    Próxima: ${vehicle.proximaViagem}
                    ${
                      minutosAtePartida !== null
                        ? `<span class="minutos-restantes">(${minutosAtePartida} min)</span>`
                        : ""
                    }
                </div>`
                : ""
            }
        `;

    return card;
  }

  showVehicleDetails(vehicle) {
    const vehicleStats = this.vehicleManager.getVehicleStats(
      vehicle.prefixo,
      this.scheduleManager.scheduleData
    );

    this.createVehicleModal(vehicle, vehicleStats);
  }

  // Criar modal de detalhes
  createVehicleModal(vehicle, vehicleStats) {
    const existingModal = document.getElementById("vehicleDetailsModal");
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement("div");
    modal.id = "vehicleDetailsModal";
    modal.className = "vehicle-modal";
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    const modalContent = document.createElement("div");
    modalContent.className = "vehicle-modal-content";
    modalContent.style.cssText = `
        background: #1a1f2e;
        padding: 20px;
        border-radius: 8px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        border: 2px solid #ffcc00;
    `;

    const lang = "pt"; // Ou usar this.scheduleManager.config.language

    modalContent.innerHTML = `
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #353a41; padding-bottom: 10px;">
            <h2 style="color: #ffcc00; margin: 0;">DETALHES DO VEÍCULO</h2>
            <button class="close-modal" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">FECHAR</button>
        </div>
        
        <div class="vehicle-info" style="margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <div><strong>Prefixo:</strong> ${vehicle.prefixo}</div>
                <div><strong>Placa:</strong> ${vehicle.placa}</div>
                <div><strong>Modelo:</strong> ${vehicle.modelo}</div>
                <div><strong>Tipo:</strong> ${vehicle.tipo}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; background: #2d4059; padding: 10px; border-radius: 4px;">
                <div style="text-align: center;">
                    <div style="font-size: 1.5em; color: #ffcc00;">${
                      vehicleStats.totalTrips
                    }</div>
                    <div style="font-size: 0.8em;">Total de Viagens</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.5em; color: #28a745;">${
                      vehicleStats.completedTrips
                    }</div>
                    <div style="font-size: 0.8em;">Concluídas</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.5em; color: #17a2b8;">${
                      vehicleStats.pendingTrips
                    }</div>
                    <div style="font-size: 0.8em;">Pendentes</div>
                </div>
            </div>
        </div>
        
        <div class="schedule-section">
            <h3 style="color: #ffcc00; margin-bottom: 15px;">HORÁRIOS PROGRAMADOS</h3>
            <div class="schedule-list" style="max-height: 300px; overflow-y: auto;">
                ${this.generateScheduleHTML(vehicleStats.vehicleSchedule)}
            </div>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Evento para fechar modal
    modalContent.querySelector(".close-modal").addEventListener("click", () => {
      modal.remove();
    });

    // Fechar ao clicar fora
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Gerar HTML da lista de horários
  generateScheduleHTML(schedule) {
    if (schedule.length === 0) {
      return '<div style="text-align: center; color: #6c757d; padding: 20px;">Nenhum horário programado</div>';
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    return schedule
      .map((departure) => {
        const [hours, minutes] = departure.time.split(":").map(Number);
        const departureTime = hours * 60 + minutes;
        const retornoTime = departureTime + (departure.duracao || 45);

        let status = "pending";
        let statusText = "PENDENTE";

        if (currentTime > retornoTime) {
          status = "completed";
          statusText = "CONCLUÍDA";
        } else if (currentTime >= departureTime && currentTime <= retornoTime) {
          status = "in_progress";
          statusText = "EM ANDAMENTO";
        }

        const statusColors = {
          pending: "#17a2b8",
          in_progress: "#28a745",
          completed: "#6c757d",
        };

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin-bottom: 5px; background: #2d4059; border-radius: 4px; border-left: 4px solid ${
              statusColors[status]
            }">
                <div>
                    <div style="font-weight: bold;">${departure.time} - ${
          departure.line
        }</div>
                    <div style="font-size: 0.8em; color: #e6e6e6;">${
                      departure.destination
                    }</div>
                    <div style="font-size: 0.7em; color: #17a2b8;">Duração: ${
                      departure.duracao || 45
                    }min • Plataforma: ${departure.platform}</div>
                </div>
                <div style="background: ${
                  statusColors[status]
                }; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold;">
                    ${statusText}
                </div>
            </div>
        `;
      })
      .join("");
  }

  createRetornandoVehicleCard(vehicle) {
    const card = document.createElement("div");
    card.className = "vehicle-card retornando-card";

    const tempoAteRetorno = this.vehicleManager.getTempoAteRetornoFormatado(
      vehicle.tempoAteRetorno
    );

    card.innerHTML = `
            <div class="vehicle-header">
                <div class="vehicle-prefixo">${vehicle.prefixo}</div>
                <div class="vehicle-placa">${vehicle.placa}</div>
            </div>
            <div class="vehicle-info">
                <div class="vehicle-modelo">${vehicle.modelo}</div>
                <div class="vehicle-tipo">${vehicle.tipo}</div>
            </div>
            <div class="vehicle-status">
                <div class="status-badge status-viagem">
                    RETORNANDO
                </div>
                ${
                  vehicle.linhaAtual
                    ? `<div class="linha-info">${vehicle.linhaAtual}</div>`
                    : ""
                }
            </div>
            <div class="retorno-info">
                <div class="partida">Partiu: ${vehicle.ultimaPartida}</div>
                <div class="horario-retorno">Retorno: ${
                  vehicle.horarioRetorno
                }</div>
                <div class="tempo-ate-retorno">⏱️ Chega em: ${tempoAteRetorno}</div>
            </div>
            ${
              vehicle.proximaViagem
                ? `<div class="proxima-viagem">
                    Próxima viagem: ${vehicle.proximaViagem}
                </div>`
                : ""
            }
        `;

    return card;
  }
}

// Inicializar aplicação quando a página carregar
document.addEventListener("DOMContentLoaded", () => {
  new VehiclesApp();
});
