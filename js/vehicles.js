class VehiclesApp {
  constructor() {
    this.vehicleManager = new VehicleManager();
    this.scheduleManager = new ScheduleManager();
    this.initializeElements();
    this.init();
  }

  // ADICIONAR ESTE MÉTODO QUE ESTÁ FALTANDO
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

  // ADICIONAR ESTES MÉTODOS QUE TAMBÉM ESTÃO FALTANDO
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

  initializeElements() {
    // Elementos DOM
    this.clockElement = document.getElementById("clock");
    this.dateElement = document.getElementById("date");

    // Elementos de estatísticas
    this.totalVehiclesElement = document.getElementById("totalVehicles");
    this.vehiclesViagemElement = document.getElementById("vehiclesViagem");
    this.vehiclesPlataformaElement = document.getElementById("vehiclesPlataforma");
    this.vehiclesAlinhandoElement = document.getElementById("vehiclesAlinhando");
    this.vehiclesAguardandoElement = document.getElementById("vehiclesAguardando");
    this.vehiclesReservaElement = document.getElementById("vehiclesReserva");

    // Elementos dos grids
    this.viagemVehiclesElement = document.getElementById("viagemVehicles");
    this.plataformaVehiclesElement = document.getElementById("plataformaVehicles");
    this.alinhandoVehiclesElement = document.getElementById("alinhandoVehicles");
    this.aguardandoVehiclesElement = document.getElementById("aguardandoVehicles");
    this.reservaVehiclesElement = document.getElementById("reservaVehicles");

    // Elemento para veículos retornando
    this.retornandoVehiclesElement = document.getElementById("retornandoVehicles");

    // Elementos de busca
    this.initializeSearchElements();
  }

  initializeSearchElements() {
    // Criar barra de busca
    const searchContainer = document.createElement("div");
    searchContainer.className = "search-container";
    searchContainer.innerHTML = `
      <div class="search-box">
        <input type="text" id="vehicleSearch" placeholder="Buscar por prefixo, placa ou linha..." class="search-input">
        <button id="clearSearch" class="clear-search">×</button>
      </div>
      <div class="search-info" id="searchInfo"></div>
    `;

    // Inserir após as estatísticas
    const fleetStats = document.getElementById("fleetStats");
    fleetStats.parentNode.insertBefore(searchContainer, fleetStats.nextSibling);

    // Configurar eventos de busca
    this.setupSearchEvents();
  }

  setupSearchEvents() {
    const searchInput = document.getElementById("vehicleSearch");
    const clearSearch = document.getElementById("clearSearch");
    const searchInfo = document.getElementById("searchInfo");

    let searchTimeout;

    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.handleSearch(e.target.value);
      }, 300);
    });

    clearSearch.addEventListener("click", () => {
      searchInput.value = "";
      this.handleSearch("");
      searchInput.focus();
    });

    // Tecla Escape para limpar busca
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchInput.value = "";
        this.handleSearch("");
      }
    });
  }

  handleSearch(searchTerm) {
    const searchInfo = document.getElementById("searchInfo");

    if (!searchTerm || searchTerm.trim() === "") {
      // Modo normal - mostrar todas as seções
      this.showAllSections();
      searchInfo.textContent = "";
      searchInfo.className = "search-info";
      return;
    }

    // Modo busca - mostrar apenas resultados da busca
    this.hideAllSections();

    const results = this.vehicleManager.searchVehicles(searchTerm);
    this.displaySearchResults(results, searchTerm);

    // Atualizar info da busca
    if (results.length > 0) {
      searchInfo.textContent = `${results.length} veículo(s) encontrado(s) para "${searchTerm}"`;
      searchInfo.className = "search-info has-results";
    } else {
      searchInfo.textContent = `Nenhum veículo encontrado para "${searchTerm}"`;
      searchInfo.className = "search-info no-results";
    }
  }

  showAllSections() {
    document.querySelectorAll(".section").forEach((section) => {
      section.style.display = "block";
    });
  }

  hideAllSections() {
    document.querySelectorAll(".section").forEach((section) => {
      section.style.display = "none";
    });
  }

  displaySearchResults(results, searchTerm) {
    // Criar container temporário para resultados
    let resultsContainer = document.getElementById("searchResultsContainer");
    if (!resultsContainer) {
      resultsContainer = document.createElement("div");
      resultsContainer.id = "searchResultsContainer";
      resultsContainer.className = "section";
      resultsContainer.innerHTML =
        '<h3>🔍 RESULTADOS DA BUSCA</h3><div class="vehicles-grid" id="searchResultsGrid"></div>';

      const firstSection = document.querySelector(".section");
      firstSection.parentNode.insertBefore(resultsContainer, firstSection);
    }

    resultsContainer.style.display = "block";

    const searchResultsGrid = document.getElementById("searchResultsGrid");
    searchResultsGrid.innerHTML = "";

    if (results.length === 0) {
      searchResultsGrid.innerHTML =
        '<div class="no-vehicles">Nenhum veículo encontrado</div>';
      return;
    }

    results.forEach((vehicle) => {
      const card = this.createVehicleCard(vehicle, true, searchTerm);
      searchResultsGrid.appendChild(card);
    });
  }

  async init() {
    this.updateClock();

    try {
      // Carregar dados dos veículos
      await this.vehicleManager.loadVehicleData();

      // Carregar horários para atualizar status dos veículos
      await this.scheduleManager.loadScheduleData();

      // Verificar se os dados foram carregados e definir no vehicleManager
      if (
        this.scheduleManager.scheduleData &&
        this.scheduleManager.scheduleData.length > 0
      ) {
        this.vehicleManager.setCurrentScheduleData(
          this.scheduleManager.scheduleData
        );
        this.vehicleManager.updateVehicleWithSchedule();
      } else {
        console.warn("Nenhum dado de horário carregado, usando dados locais");
      }

      // Atualizar interface
      this.updateStatistics();
      this.updateVehicleDisplays();

      // Atualizar relógio
      setInterval(() => this.updateClock(), 1000);

      // Atualizar dados a cada 10 segundos
      setInterval(() => {
        if (
          this.scheduleManager.scheduleData &&
          this.scheduleManager.scheduleData.length > 0
        ) {
          this.vehicleManager.setCurrentScheduleData(
            this.scheduleManager.scheduleData
          );
          this.vehicleManager.updateVehicleWithSchedule();
          this.updateVehicleDisplays();
        }
      }, 10000);
    } catch (error) {
      console.error("Erro na inicialização:", error);
      this.updateStatistics();
      this.updateVehicleDisplays();
    }
  }

  // Modificar createVehicleCard para suportar highlight de busca
  createVehicleCard(vehicle, isSearchResult = false, searchTerm = "") {
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

    // Função para highlight do termo de busca
    const highlightText = (text, term) => {
      if (!isSearchResult || !term) return text;

      const regex = new RegExp(`(${this.escapeRegExp(term)})`, "gi");
      return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    };

    card.innerHTML = `
            <div class="vehicle-header">
                <div class="vehicle-prefixo">${highlightText(
                  vehicle.prefixo,
                  searchTerm
                )}</div>
                <div class="vehicle-placa">${highlightText(
                  vehicle.placa,
                  searchTerm
                )}</div>
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
                    ? `<div class="linha-info">${highlightText(
                        vehicle.linhaAtual,
                        searchTerm
                      )}</div>`
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

  // ADICIONAR MÉTODO PARA ESCAPAR CARACTERES ESPECIAIS NA BUSCA
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    const lang = "pt";

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
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #2d4059; padding: 10px; border-radius: 4px;">
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