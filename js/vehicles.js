class VehiclesApp {
  constructor() {
    this.vehicleManager = new VehicleManager();
    this.scheduleManager = new ScheduleManager();
    this.initializeElements();
    this.init();
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

  initializeElements() {
    this.clockElement = document.getElementById("clock");
    this.dateElement = document.getElementById("date");

    this.totalVehiclesElement = document.getElementById("totalVehicles");
    this.vehiclesViagemElement = document.getElementById("vehiclesViagem");
    this.vehiclesPlataformaElement =
      document.getElementById("vehiclesPlataforma");
    this.vehiclesAlinhandoElement =
      document.getElementById("vehiclesAlinhando");
    this.vehiclesAguardandoElement =
      document.getElementById("vehiclesAguardando");
    this.vehiclesReservaElement = document.getElementById("vehiclesReserva");

    this.viagemVehiclesElement = document.getElementById("viagemVehicles");
    this.plataformaVehiclesElement =
      document.getElementById("plataformaVehicles");
    this.alinhandoVehiclesElement =
      document.getElementById("alinhandoVehicles");
    this.aguardandoVehiclesElement =
      document.getElementById("aguardandoVehicles");
    this.reservaVehiclesElement = document.getElementById("reservaVehicles");

    this.retornandoVehiclesElement =
      document.getElementById("retornandoVehicles");

    this.initializeSearchElements();
  }

  initializeSearchElements() {
    const searchContainer = document.createElement("div");
    searchContainer.className = "search-container";
    searchContainer.innerHTML = `
      <div class="search-box">
        <input type="text" id="vehicleSearch" placeholder="Buscar por prefixo, placa ou linha..." class="search-input">
        <button id="clearSearch" class="clear-search">×</button>
      </div>
      <div class="search-info" id="searchInfo"></div>
    `;

    const fleetStats = document.getElementById("fleetStats");
    fleetStats.parentNode.insertBefore(searchContainer, fleetStats.nextSibling);

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
      this.showAllSections();
      searchInfo.textContent = "";
      searchInfo.className = "search-info";
      return;
    }

    this.hideAllSections();

    const results = this.vehicleManager.searchVehicles(searchTerm);
    this.displaySearchResults(results, searchTerm);

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
      await this.vehicleManager.loadVehicleData();
      await this.scheduleManager.loadScheduleData();

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

      this.updateStatistics();
      this.updateVehicleDisplays();

      setInterval(() => this.updateClock(), 1000);

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

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  isToday(dateString) {
    try {
      const today = new Date();
      const targetDate = new Date(dateString);
      
      return today.getDate() === targetDate.getDate() &&
             today.getMonth() === targetDate.getMonth() &&
             today.getFullYear() === targetDate.getFullYear();
    } catch (error) {
      console.error("Erro em isToday:", error);
      return false;
    }
  }

  extractTodayData(multiDayStats) {
    if (!multiDayStats || !multiDayStats.days) {
      return {
        completedTrips: 0,
        inProgressTrips: 0,
        pendingTrips: 0,
        totalTripsToday: 0,
        dateDisplay: "Hoje"
      };
    }

    const hoje = multiDayStats.days.find(
      (day) => day.dateDisplay === "Hoje" || this.isToday(day.date)
    );

    if (!hoje) {
      return {
        completedTrips: 0,
        inProgressTrips: 0,
        pendingTrips: 0,
        totalTripsToday: 0,
        dateDisplay: "Hoje"
      };
    }

    return {
      completedTrips: hoje.completedTrips || 0,
      inProgressTrips: hoje.inProgressTrips || 0,
      pendingTrips: hoje.pendingTrips || 0,
      totalTripsToday: hoje.totalTrips || 0,
      dateDisplay: hoje.dateDisplay || "Hoje"
    };
  }

  async showVehicleDetails(vehicle) {
    try {
      const multiDayStats = await this.vehicleManager.getVehicleMultiDayStats(
        vehicle.prefixo,
        this.scheduleManager,
        4
      );

      const hojeData = this.extractTodayData(multiDayStats);
      
      this.createVehicleModal(vehicle, multiDayStats, hojeData);
    } catch (error) {
      console.error("Erro ao carregar detalhes do veículo:", error);

      const stats = this.vehicleManager.getVehicleStats(
        vehicle.prefixo,
        this.scheduleManager.scheduleData
      );
      
      const hojeData = {
        completedTrips: stats.completedTrips || 0,
        inProgressTrips: 0,
        pendingTrips: stats.pendingTrips || 0,
        totalTripsToday: stats.totalTrips || 0,
        dateDisplay: "Hoje"
      };
      
      const fallbackMultiDayStats = {
        totalDays: 1,
        days: [{
          date: new Date().toISOString().split('T')[0],
          dateDisplay: "Hoje",
          totalTrips: stats.totalTrips || 0,
          completedTrips: stats.completedTrips || 0,
          pendingTrips: stats.pendingTrips || 0,
          inProgressTrips: 0,
          schedules: stats.vehicleSchedule || []
        }]
      };
      
      this.createVehicleModal(vehicle, fallbackMultiDayStats, hojeData);
    }
  }

  createVehicleModal(vehicle, multiDayStats, hojeData) {
    if (!hojeData) {
      hojeData = {
        completedTrips: 0,
        inProgressTrips: 0,
        pendingTrips: 0,
        totalTripsToday: 0,
        dateDisplay: "Hoje"
      };
    }
    
    if (!multiDayStats) {
      multiDayStats = {
        totalDays: 0,
        days: []
      };
    }

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
    max-width: 700px;
    width: 90%;
    max-height: 85vh;
    overflow-y: auto;
    border: 2px solid #ffcc00;
  `;

    const totalTrips = this.calculateTotalTrips(multiDayStats);
    const tabsHTML = this.generateTabsHTML(multiDayStats);
    const activeDay = multiDayStats.days && multiDayStats.days.length > 0 ? 
      multiDayStats.days.find(day => day.dateDisplay === "Hoje") || multiDayStats.days[0] : 
      null;

    modalContent.innerHTML = `
    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #353a41; padding-bottom: 10px;">
      <h2 style="color: #ffcc00; margin: 0;">DETALHES DO VEÍCULO</h2>
      <button class="close-modal" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">FECHAR</button>
    </div>
    
    <div class="vehicle-info" style="margin-bottom: 20px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
        <div><strong>Prefixo:</strong> ${vehicle?.prefixo || 'N/A'}</div>
        <div><strong>Placa:</strong> ${vehicle?.placa || 'N/A'}</div>
        <div><strong>Modelo:</strong> ${vehicle?.modelo || 'N/A'}</div>
        <div><strong>Tipo:</strong> ${vehicle?.tipo || 'N/A'}</div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #2d4059; padding: 10px; border-radius: 4px; margin-bottom: 20px;">
        <div style="text-align: center;">
          <div style="font-size: 1.5em; color: #ffcc00;">${multiDayStats.totalDays || 0}</div>
          <div style="font-size: 0.8em;">Dias com viagens</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 1.5em; color: #28a745;">${hojeData.completedTrips || 0}</div>
          <div style="font-size: 0.8em;">Concluídas (Hoje)</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 1.5em; color: #17a2b8;">${hojeData.inProgressTrips || 0}</div>
          <div style="font-size: 0.8em;">Em Andamento</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 1.5em; color: #6f42c1;">${hojeData.pendingTrips || 0}</div>
          <div style="font-size: 0.8em;">Pendentes (Hoje)</div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: #1e2a38; padding: 10px; border-radius: 4px; margin-top: 10px;">
        <div style="text-align: center;">
          <div style="font-size: 1em; color: #ffcc00;">Total de viagens (${multiDayStats.totalDays || 0} dias): ${totalTrips}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 1em; color: #ffcc00;">Viagens hoje: ${hojeData.totalTripsToday || 0}</div>
        </div>
      </div>
    </div>
    
    <div class="days-tabs-container" style="margin-bottom: 20px;">
      <div class="tabs-header" style="display: flex; gap: 5px; margin-bottom: 15px; overflow-x: auto; padding-bottom: 10px;">
        ${tabsHTML}
      </div>
      
      <div class="tab-content" id="tabContent" style="min-height: 300px;">
        ${activeDay ? this.generateDayScheduleHTML(activeDay.schedules, activeDay.dateDisplay === "Hoje") : 
          '<div style="text-align: center; color: #6c757d; padding: 20px; background: #2d4059; border-radius: 4px;">Nenhum horário programado</div>'}
      </div>
    </div>
  `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    this.setupTabEvents(modalContent, multiDayStats);

    modalContent.querySelector(".close-modal").addEventListener("click", () => {
      modal.remove();
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  generateTabsHTML(multiDayStats) {
    if (!multiDayStats || !multiDayStats.days || multiDayStats.days.length === 0) {
      return '<div style="padding: 10px; text-align: center; color: #6c757d;">Nenhum dia disponível</div>';
    }

    return multiDayStats.days.map((day, index) => {
      const isActive = index === 0;
      const tabId = `tab-${day.date || index}`;
      
      let displayText = day.dateDisplay;
      if (!displayText || displayText === "Hoje") {
        displayText = "Hoje";
      } else if (displayText === "Amanhã") {
        displayText = "Amanhã";
      } else {
        const [year, month, dayNum] = day.date.split('-');
        displayText = `${dayNum}/${month}`;
      }
      
      let tabColor = "#6c757d";
      if (day.dateDisplay === "Hoje") {
        tabColor = "#886d00ff";
      } else if (day.dateDisplay === "Amanhã") {
        tabColor = "#17a2b8";
      } else {
        tabColor = "#6f42c1";
      }
      
      return `
        <button 
          class="day-tab ${isActive ? 'active' : ''}" 
          data-tab="${tabId}" 
          data-day-index="${index}"
          style="
            background: ${isActive ? tabColor : '#2d4059'};
            color: ${isActive ? '#ffffff' : '#adb5bd'};
            border: 1px solid ${tabColor};
            padding: 8px 15px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: ${isActive ? 'bold' : 'normal'};
            white-space: nowrap;
            transition: all 0.3s ease;
            flex-shrink: 0;
          "
        >
          ${displayText}
          ${day.totalTrips ? `<span style="margin-left: 5px; font-size: 0.8em;">(${day.totalTrips})</span>` : ''}
        </button>
      `;
    }).join('');
  }

  setupTabEvents(modalContent, multiDayStats) {
    const tabButtons = modalContent.querySelectorAll('.day-tab');
    const tabContent = modalContent.querySelector('#tabContent');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        tabButtons.forEach(tab => {
          tab.classList.remove('active');
          tab.style.background = '#2d4059';
          tab.style.color = '#adb5bd';
          tab.style.fontWeight = 'normal';
        });
        
        button.classList.add('active');
        const tabColor = this.getTabColor(button.textContent);
        button.style.background = tabColor;
        button.style.color = '#ffffff';
        button.style.fontWeight = 'bold';
        
        const dayIndex = parseInt(button.getAttribute('data-day-index'));
        const dayData = multiDayStats.days[dayIndex];
        
        if (dayData) {
          tabContent.innerHTML = this.generateDayScheduleHTML(
            dayData.schedules, 
            dayData.dateDisplay === "Hoje"
          );
        }
      });
      
      button.addEventListener('mouseover', () => {
        if (!button.classList.contains('active')) {
          button.style.background = '#3a4a63';
        }
      });
      
      button.addEventListener('mouseout', () => {
        if (!button.classList.contains('active')) {
          button.style.background = '#2d4059';
        }
      });
    });
  }

  getTabColor(tabText) {
    if (tabText.includes('Hoje')) return '#645000ff';
    if (tabText.includes('Amanhã')) return '#17a2b8';
    return '#6f42c1';
  }

  generateDayScheduleHTML(schedule, isToday) {
    if (!schedule || schedule.length === 0) {
      return `
        <div style="text-align: center; color: #6c757d; padding: 40px; background: #2d4059; border-radius: 8px;">
          <div style="font-size: 1.2em; margin-bottom: 10px;">📭</div>
          <div>Sem horários programados para este dia</div>
        </div>
      `;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const grouped = {
      in_progress: [],
      upcoming: [],
      completed: [],
      future: [],
      pending: []
    };

    schedule.forEach((departure) => {
      if (!departure) return;

      const [hours, minutes] = (departure.time || "00:00")
        .split(":")
        .map(Number);
      const departureTime = hours * 60 + minutes;
      const retornoTime = departureTime + (departure.duracao || 45);

      let status = "pending";
      let statusText = "PENDENTE";
      let statusColor = "#17a2b8";
      let statusOrder = 4;

      if (isToday) {
        if (currentTime > retornoTime) {
          status = "completed";
          statusText = "CONCLUÍDA";
          statusColor = "#6c757d";
          statusOrder = 3;
        } else if (
          currentTime >= departureTime &&
          currentTime <= retornoTime
        ) {
          status = "in_progress";
          statusText = "EM VIAGEM";
          statusColor = "#28a745";
          statusOrder = 0;
        } else if (
          currentTime >= departureTime - 15 &&
          currentTime < departureTime
        ) {
          status = "upcoming";
          statusText = "EM BREVE";
          statusColor = "#ffc107";
          statusOrder = 1;
        } else {
          status = "pending";
          statusText = "AGENDADA";
          statusColor = "#17a2b8";
          statusOrder = 2;
        }
      } else {
        status = "future";
        statusText = "PROGRAMADA";
        statusColor = "#6f42c1";
        statusOrder = 4;
      }

      grouped[status].push({
        ...departure,
        status,
        statusText,
        statusColor,
        statusOrder,
        departureTime,
        retornoTime
      });
    });

    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.departureTime - b.departureTime);
    });

    const allItems = [
      ...grouped.in_progress,
      ...grouped.upcoming,
      ...grouped.pending,
      ...grouped.completed,
      ...grouped.future
    ];

    const statusCounts = {
      em_viagem: grouped.in_progress.length,
      em_breve: grouped.upcoming.length,
      agendada: grouped.pending.length,
      concluida: grouped.completed.length,
      programada: grouped.future.length
    };

    let headerHTML = '';
    if (isToday) {
      headerHTML = `
        <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
          ${statusCounts.em_viagem > 0 ? `
            <div style="background: #28a745; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8em;">
              🟢 Em viagem: ${statusCounts.em_viagem}
            </div>
          ` : ''}
          ${statusCounts.em_breve > 0 ? `
            <div style="background: #ffc107; color: #000; padding: 4px 8px; border-radius: 12px; font-size: 0.8em;">
              🟡 Em breve: ${statusCounts.em_breve}
            </div>
          ` : ''}
          ${statusCounts.agendada > 0 ? `
            <div style="background: #17a2b8; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8em;">
              🔵 Agendada: ${statusCounts.agendada}
            </div>
          ` : ''}
          ${statusCounts.concluida > 0 ? `
            <div style="background: #6c757d; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8em;">
              ⚫ Concluída: ${statusCounts.concluida}
            </div>
          ` : ''}
        </div>
      `;
    } else {
      headerHTML = `
        <div style="background: #6f42c1; color: white; padding: 8px 12px; border-radius: 8px; margin-bottom: 15px; font-size: 0.9em;">
          📅 ${statusCounts.programada} viagem(s) programada(s) para este dia
        </div>
      `;
    }

    const itemsHTML = allItems.map((departure) => {
      let minutesInfo = '';
      if (isToday && departure.status === 'upcoming') {
        const minutesUntil = departure.departureTime - currentTime;
        if (minutesUntil > 0) {
          minutesInfo = `<div style="font-size: 0.7em; color: #ffc107; margin-top: 2px;">⏱️ Partida em ${minutesUntil} min</div>`;
        }
      }

      return `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px; margin-bottom: 8px; background: #2d4059; border-radius: 8px; border-left: 5px solid ${departure.statusColor};">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
              <div style="font-weight: bold; font-size: 1.1em; color: #ffffff;">
                <span style="color: ${departure.statusColor};">${departure.time || "00:00"}</span>
              </div>
              <div style="background: ${departure.statusColor}; color: white; padding: 3px 8px; border-radius: 10px; font-size: 0.8em; font-weight: bold;">
                ${departure.statusText}
              </div>
            </div>
            <div style="font-size: 1em; color: #ffffff; margin-bottom: 5px;">
              <strong>${departure.line || "N/A"}</strong>
            </div>
            <div style="font-size: 0.85em; color: #e6e6e6; margin-bottom: 3px;">
              ${departure.destination || "Sem destino"}
            </div>
            <div style="font-size: 0.75em; color: #adb5bd; display: flex; gap: 10px;">
              <span>⏱️ ${departure.duracao || 45}min</span>
              <span>🚏 Plataforma ${departure.platform || "N/A"}</span>
            </div>
            ${minutesInfo}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="schedule-content">
        ${headerHTML}
        <div style="max-height: 350px; overflow-y: auto; padding-right: 5px;">
          ${itemsHTML}
        </div>
      </div>
    `;
  }

  calculateTotalTrips(multiDayStats) {
    if (!multiDayStats || !multiDayStats.days) return 0;
    return multiDayStats.days.reduce(
      (total, day) => total + (day.totalTrips || 0),
      0
    );
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

document.addEventListener("DOMContentLoaded", () => {
  new VehiclesApp();
});