class BusDeparturesApp {
  "";
  constructor() {
    this.scheduleManager = new ScheduleManager();
    this.isLoading = false;
    this.languageInterval = null;
    this.rotationTimeout = null;
    this.maxVisibleRows = 10; // Máximo de linhas visíveis inicialmente
    this.showAllDepartures = false; // Controla se mostra todas ou apenas as próximas
    this.initializeElements();
    this.setupEventListeners();
    this.rotationInterval = null;
    this.currentRotationLine = null;
    this.isRotationMode = false;
    this.rotationDuration = 15000; // 15 segundos mostrando a linha destacada
    this.rotationDelay = 20000; // 20 segundos entre rotações (5 segundos de tabela geral)
  }

  // Inicializar o painel de status das linhas
  initializeLinesStatus() {
    this.linesStatusElement = document.getElementById("linesStatus");
    this.linesGridElement = document.getElementById("linesGrid");
    this.linesStatusTitleElement = document.getElementById("linesStatusTitle");
    this.statusModalElement = document.getElementById("statusModal");
    this.modalTitleElement = document.getElementById("modalTitle");
    this.closeModalElement = document.getElementById("closeModal");

    this.linesData = new Map(); // Armazenar status das linhas
    this.currentEditingLine = null;

    this.setupStatusModalEvents();
  }

  // Configurar eventos do modal
  setupStatusModalEvents() {
    // Fechar modal
    this.closeModalElement.addEventListener("click", () => {
      this.hideStatusModal();
    });

    // Clicar fora do modal para fechar
    this.statusModalElement.addEventListener("click", (e) => {
      if (e.target === this.statusModalElement) {
        this.hideStatusModal();
      }
    });

    // Selecionar opção de status
    document.querySelectorAll(".status-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        const status = e.target.getAttribute("data-status");
        this.updateLineStatus(this.currentEditingLine, status);
        this.hideStatusModal();
      });
    });
  }

  // Mostrar modal de status
  showStatusModal(lineData) {
    this.currentEditingLine = lineData;
    this.modalTitleElement.textContent = `ALTERAR STATUS - ${lineData.line}`;
    this.statusModalElement.style.display = "flex";
  }

  // Esconder modal de status
  hideStatusModal() {
    this.statusModalElement.style.display = "none";
    this.currentEditingLine = null;
  }

  // Atualizar status de uma linha
  updateLineStatus(lineData, newStatus) {
    const lineKey = lineData.line;
    this.linesData.set(lineKey, {
      ...lineData,
      status: newStatus,
      lastUpdate: new Date(),
    });

    this.updateLinesDisplay();

    // Se status for "encerrada", verificar se é automático
    if (newStatus === "ended") {
      console.log(`Linha ${lineData.line} encerrada manualmente`);
    }
  }

  // Atualizar display do painel de linhas
  updateLinesDisplay() {
    const lang = this.scheduleManager.config.language;

    // Limpar grid
    this.linesGridElement.innerHTML = "";

    // Adicionar cada linha
    this.linesData.forEach((lineData, lineKey) => {
      const lineElement = this.createLineElement(lineData, lang);
      this.linesGridElement.appendChild(lineElement);
    });
  }

  // Criar elemento de linha
  createLineElement(lineData, lang) {
    const div = document.createElement("div");
    div.className = "line-status-item";
    div.addEventListener("click", () => this.showStatusModal(lineData));

    const statusTexts = {
      pt: {
        normal: "OPERAÇÃO NORMAL",
        reduced: "VELOCIDADE REDUZIDA",
        paralyzed: "PARALISADA",
        ended: "ENCERRADA",
      },
      en: {
        normal: "NORMAL OPERATION",
        reduced: "REDUCED SPEED",
        paralyzed: "PARALYZED",
        ended: "ENDED",
      },
    };

    const statusClass = {
      normal: "status-normal",
      reduced: "status-reduced",
      paralyzed: "status-paralyzed",
      ended: "status-ended",
    };

    const currentLang = lang || "pt";
    const status = lineData.status || "normal";

    div.innerHTML = `
        <div class="line-color" style="background-color: ${lineData.bgColor};"></div>
        <div class="line-info">
            <div class="line-number">${lineData.line}</div>
            <div class="line-destination">${lineData.destination}</div>
        </div>
        <div class="line-status ${statusClass[status]}">
            ${statusTexts[currentLang][status]}
        </div>
    `;

    return div;
  }

  // Verificar e atualizar status automático das linhas
  updateLinesAutoStatus() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const allDepartures = this.scheduleManager.getAllUpcomingDepartures();

    // Agrupar partidas por linha
    const linesLastDeparture = new Map();

    allDepartures.forEach((departure) => {
      const [hours, minutes] = departure.time.split(":").map(Number);
      const departureTime = hours * 60 + minutes;
      const lineKey = departure.line;

      if (
        !linesLastDeparture.has(lineKey) ||
        departureTime > linesLastDeparture.get(lineKey)
      ) {
        linesLastDeparture.set(lineKey, departureTime);
      }
    });

    // Verificar se alguma linha deve ser automaticamente encerrada
    linesLastDeparture.forEach((lastDepartureTime, lineKey) => {
      // Se a última partida foi há mais de 30 minutos, encerrar automaticamente
      if (currentTime > lastDepartureTime + 30) {
        const lineData = this.linesData.get(lineKey);
        if (lineData && lineData.status !== "ended") {
          this.updateLineStatus(lineData, "ended");
          console.log(`Linha ${lineKey} encerrada automaticamente`);
        }
      }
    });
  }

  // Inicializar dados das linhas a partir dos horários carregados
  initializeLinesFromSchedule() {
    const allDepartures = this.scheduleManager.getAllUpcomingDepartures();
    const uniqueLines = new Map();

    // Coletar linhas únicas
    allDepartures.forEach((departure) => {
      const lineKey = departure.line;
      if (!uniqueLines.has(lineKey)) {
        uniqueLines.set(lineKey, {
          line: departure.line,
          destination: departure.destination,
          bgColor: departure.bgColor,
          textColor: departure.textColor,
          status: "normal",
        });
      }
    });

    // Manter status existentes se possível
    uniqueLines.forEach((newLineData, lineKey) => {
      if (this.linesData.has(lineKey)) {
        // Manter status anterior
        const existingData = this.linesData.get(lineKey);
        newLineData.status = existingData.status;
      }
      this.linesData.set(lineKey, newLineData);
    });

    this.updateLinesDisplay();
  }

  initializeElements() {
    // Elementos DOM
    this.clockElement = document.getElementById("clock");
    this.dateElement = document.getElementById("date"); // Novo elemento da data
    this.clockLabelElement = document.getElementById("clockLabel");
    this.titleElement = document.querySelector(".header-title");
    this.loadingMessageElement = document.getElementById("loadingMessage");
    this.statusMessageElement = document.getElementById("statusMessage");
    this.scheduleBodyElement = document.getElementById("scheduleBody");
    this.fileSelectorElement = document.getElementById("fileSelector");
    this.fileButtons = document.querySelectorAll(".file-btn");
    this.thTimeElement = document.getElementById("thTime");
    this.thLineElement = document.getElementById("thLine");
    this.thDestinationElement = document.getElementById("thDestination");
    this.thVehicleElement = document.getElementById("thVehicle");
    this.thPlatformElement = document.getElementById("thPlatform");
    this.thObservationElement = document.getElementById("thObservation");
    this.tableContainerElement = document.getElementById("tableContainer");

    // Verificar se os elementos foram encontrados
    this.validateElements();
  }

  // Validar se todos os elementos necessários existem
  validateElements() {
    const requiredElements = [
      { element: this.clockElement, name: "clock" },
      { element: this.dateElement, name: "date" },
      { element: this.titleElement, name: "header-title" },
      { element: this.loadingMessageElement, name: "loadingMessage" },
      { element: this.statusMessageElement, name: "statusMessage" },
      { element: this.scheduleBodyElement, name: "scheduleBody" },
      { element: this.fileSelectorElement, name: "fileSelector" },
    ];

    requiredElements.forEach((item) => {
      if (!item.element) {
        console.error(`Elemento não encontrado: ${item.name}`);
      }
    });
  }

  setupEventListeners() {
    // Configurar eventos dos botões de arquivo
    this.fileButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const fileSelection = e.target.getAttribute("data-file");
        this.loadSelectedFile(fileSelection);
      });
    });

    // Evento de scroll para carregar mais partidas se necessário
    const tableContainer = document.querySelector(".table-container");
    if (tableContainer) {
      tableContainer.addEventListener("scroll", () => {
        this.handleScroll();
      });
    }
  }

  // Manipular scroll para mostrar/ocultar indicador
  handleScroll() {
    const tableContainer = document.querySelector(".table-container");
    if (!tableContainer) return;

    const scrollPosition = tableContainer.scrollTop;
    const scrollHeight = tableContainer.scrollHeight;
    const clientHeight = tableContainer.clientHeight;

    // Se estiver perto do final, mostrar todas as partidas
    if (
      scrollPosition + clientHeight >= scrollHeight - 50 &&
      !this.showAllDepartures
    ) {
      this.showAllDepartures = true;
      this.updateSchedule();
    }
  }

  // Mostrar/ocultar loading
  showLoading(show) {
    this.isLoading = show;
    if (this.loadingMessageElement) {
      this.loadingMessageElement.style.display = show ? "block" : "none";
    }
    if (show && this.statusMessageElement) {
      this.statusMessageElement.style.display = "none";
    }
  }

  // Atualizar botões de arquivo ativos
  updateFileButtons(activeFile) {
    this.fileButtons.forEach((button) => {
      if (button.getAttribute("data-file") === activeFile) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });
  }

  // Carregar arquivo selecionado
  async loadSelectedFile(fileSelection) {
    this.showLoading(true);
    this.showAllDepartures = false; // Reset para mostrar apenas as próximas
    try {
      await this.scheduleManager.loadSelectedFile(fileSelection);
      this.updateFileButtons(fileSelection);
      this.updateSchedule();
    } catch (error) {
      console.error("Erro ao carregar arquivo selecionado:", error);
      if (this.statusMessageElement) {
        this.statusMessageElement.textContent =
          translations[this.scheduleManager.config.language].operationEnded;
        this.statusMessageElement.style.display = "block";
      }
    } finally {
      this.showLoading(false);
    }
  }

  // Formatador de data no formato DD/MM/AAAA
  formatDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  // Atualizar relógio e data
  updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    // Relógio principal (com segundos)
    if (this.clockElement) {
      this.clockElement.textContent = `${hours}:${minutes}:${seconds}`;
    }

    // Data formatada (DD/MM/AAAA)
    if (this.dateElement) {
      this.dateElement.textContent = this.formatDate(now);
    }
  }

  // Atualizar interface com base no idioma
  updateLanguage() {
    const lang = this.scheduleManager.config.language;

    // Atualizar título principal (sempre em maiúsculo)
    if (this.titleElement) {
      this.titleElement.textContent = "Vila Nova Cachoeirinha";
    }

    // Atualizar labels da tabela
    if (this.thTimeElement)
      this.thTimeElement.textContent = translations[lang].thTime;
    if (this.thLineElement)
      this.thLineElement.textContent = translations[lang].thLine;
    if (this.thDestinationElement)
      this.thDestinationElement.textContent = translations[lang].thDestination;
    if (this.thVehicleElement)
      this.thVehicleElement.textContent = translations[lang].thVehicle;
    if (this.thPlatformElement)
      this.thPlatformElement.textContent = translations[lang].thPlatform;
    if (this.thObservationElement)
      this.thObservationElement.textContent = translations[lang].thObservation;

    // Atualizar label do relógio (se existir)
    if (this.clockLabelElement) {
      this.clockLabelElement.textContent =
        lang === "pt" ? "HORÁRIO ATUAL" : "CURRENT TIME";
    }

    // Atualizar mensagem de loading
    if (this.loadingMessageElement) {
      this.loadingMessageElement.textContent =
        lang === "pt" ? "Carregando dados..." : "Loading data...";
    }

    // Atualizar data com o novo idioma
    this.updateClock();
  }

  // Alternar idioma automaticamente
  startAutoLanguageToggle() {
    // Alternar a cada 30 segundos (30000 ms)
    this.languageInterval = setInterval(() => {
      this.scheduleManager.config.language =
        this.scheduleManager.config.language === "pt" ? "en" : "pt";
      this.updateLanguage();
      this.updateSchedule();
    }, 30000); // 30 segundos
  }

  // Adicionar indicador de mais partidas
  addMoreDeparturesIndicator(totalDepartures, visibleDepartures) {
    const remaining = totalDepartures - visibleDepartures;
    if (remaining > 0 && this.scheduleBodyElement) {
      const indicatorRow = document.createElement("tr");
      const indicatorCell = document.createElement("td");
      indicatorCell.colSpan = 6;
      indicatorCell.className = "more-departures";

      const lang = this.scheduleManager.config.language;

      indicatorRow.appendChild(indicatorCell);
      this.scheduleBodyElement.appendChild(indicatorRow);
    }
  }

  startLineRotation() {
    console.log('Iniciando sistema de rotação de linhas');
    
    // Debug inicial
    setTimeout(() => {
      this.debugRotationState();
    }, 2000);
    
    // Iniciar após um delay inicial
    setTimeout(() => {
      this.rotationInterval = setInterval(() => {
        console.log('--- Executando rotação ---');
        this.debugRotationState();
        this.executeLineRotation();
      }, this.rotationDelay);
    }, 20000);
  }

  // Executar uma rotação
  executeLineRotation() {
    // Se já está em modo rotação, pular esta execução
    if (this.isRotationMode) {
      console.log('⏭️  Modo rotação ativo, pulando execução');
      return;
    }
    
    let uniqueLines = this.scheduleManager.getUniqueLines();
    
    // Fallback se não encontrar linhas
    if (uniqueLines.length === 0) {
      console.log('Usando fallback para buscar linhas');
      uniqueLines = this.getAllAvailableLines();
    }
    
    if (uniqueLines.length === 0) {
      console.log('Ainda nenhuma linha encontrada, pulando rotação');
      return;
    }
    
    console.log(`📊 Total de linhas disponíveis: ${uniqueLines.length}`);
    
    // Determinar próxima linha
    let nextLine;
    
    if (!this.currentRotationLine) {
      // Primeira execução: começar com a primeira linha
      nextLine = uniqueLines[0];
      console.log(`🎯 Iniciando rotação com linha: ${nextLine.line}`);
    } else {
      // Encontrar índice da linha atual
      const currentIndex = uniqueLines.findIndex(
        line => line.line === this.currentRotationLine.line
      );
      
      console.log(`📋 Linha atual: ${this.currentRotationLine.line} (índice: ${currentIndex})`);
      
      if (currentIndex === -1) {
        // Linha atual não encontrada, voltar para a primeira
        nextLine = uniqueLines[0];
        console.log('🔄 Linha atual não encontrada, reiniciando rotação');
      } else {
        // Avançar para próxima linha (circular)
        const nextIndex = (currentIndex + 1) % uniqueLines.length;
        nextLine = uniqueLines[nextIndex];
        console.log(`➡️  Próxima linha: ${nextLine.line} (índice: ${nextIndex})`);
      }
    }
    
    // Executar o destaque
    this.showLineHighlight(nextLine);
  }

  debugRotationState() {
    const uniqueLines = this.scheduleManager.getUniqueLines();
    console.log('=== DEBUG ROTAÇÃO ===');
    console.log('Linha atual em rotação:', this.currentRotationLine?.line);
    console.log('Modo rotação ativo:', this.isRotationMode);
    console.log('Total de linhas únicas:', uniqueLines.length);
    console.log('Próximas 3 linhas:', uniqueLines.slice(0, 3).map(l => l.line));
    console.log('=====================');
  }

  // Mostrar destaque de uma linha específica
  showLineHighlight(lineData) {
    // Limpar qualquer timeout pendente
    if (this.rotationTimeout) {
      clearTimeout(this.rotationTimeout);
    }
    
    this.isRotationMode = true;
    this.currentRotationLine = lineData; 
    
    console.log(`🎨 Mostrando destaque para linha: ${lineData.line}`);
    
    // Adicionar indicador visual
    this.showRotationIndicator(lineData);
    
    // Obter partidas da linha
    const lineDepartures = this.scheduleManager.getLineNextDepartures(lineData.line);
    
    console.log(`📅 Partidas para ${lineData.line}: ${lineDepartures.length}`);
    
    // Atualizar tabela para mostrar apenas a linha destacada
    this.updateScheduleForRotation(lineDepartures, lineData);
    
    // Configurar para voltar à tabela geral após o tempo
    this.rotationTimeout = setTimeout(() => {
      console.log('⏰ Tempo de rotação esgotado, voltando à tabela geral');
      this.isRotationMode = false;
      this.hideRotationIndicator();
      this.updateSchedule();
    }, this.rotationDuration);
  }

  // Mostrar indicador de rotação
  showRotationIndicator(lineData) {
    this.hideRotationIndicator();

    const indicator = document.createElement("div");
    indicator.className = "rotation-indicator";
    indicator.id = "rotationIndicator";

    document.body.appendChild(indicator);

    if (this.tableContainerElement) {
      this.tableContainerElement.classList.add("rotation-mode");
    }
  }

  // Esconder indicador de rotação
  hideRotationIndicator() {
    const existingIndicator = document.getElementById("rotationIndicator");
    if (existingIndicator) {
      existingIndicator.remove();
    }

    if (this.tableContainerElement) {
      this.tableContainerElement.classList.remove("rotation-mode");
    }
  }

  // Atualizar tabela para modo rotação
  updateScheduleForRotation(lineDepartures, lineData) {
    if (!this.scheduleBodyElement) return;
    
    // Limpar tabela
    this.scheduleBodyElement.innerHTML = '';
    
    if (lineDepartures.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.textContent = `Nenhuma partida disponível para a linha ${lineData.line}`;
      cell.style.textAlign = 'center';
      cell.style.padding = '20px';
      cell.className = 'rotation-no-departures';
      row.appendChild(cell);
      this.scheduleBodyElement.appendChild(row);
      return;
    }
    
    // Adicionar cabeçalho especial para a linha
    const headerRow = document.createElement('tr');
    headerRow.className = 'rotation-header';
    const headerCell = document.createElement('td');
    headerCell.colSpan = 6;
    headerCell.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 15px; padding: 12px; background: ${lineData.bgColor}; color: ${lineData.textColor}; border-radius: 8px; font-weight: bold; font-size: 1.3em; margin: 5px 0;">
        <span>${lineData.line}</span>
        <span>•</span>
        <span>${lineData.destination}</span>
      </div>
    `;
    headerRow.appendChild(headerCell);
    this.scheduleBodyElement.appendChild(headerRow);
    
    // Adicionar TODAS as partidas da linha (sem limite adicional)
    lineDepartures.forEach(departure => {
      this.createRotationRow(departure);
    });
    
    console.log(`📈 Exibindo ${lineDepartures.length} partidas para ${lineData.line}`);
  }

  // Criar linha para modo rotação
  createRotationRow(departure) {
    const minutesUntil = this.scheduleManager.minutesUntilDeparture(
      departure.time
    );
    const status = this.scheduleManager.getDepartureStatus(departure.time);

    // Não mostrar partidas que já passaram há mais de 2 minutos
    if (minutesUntil < -2) return;

    const row = document.createElement('tr');
    row.className = 'rotation-row current-rotation-line'; // Adicione current-rotation-line

    // Hora
    const timeCell = document.createElement("td");
    timeCell.textContent = departure.time;
    timeCell.style.fontWeight = "bold";
    timeCell.style.fontSize = "1.1em";
    row.appendChild(timeCell);

    // Linha (vazia pois já mostramos no cabeçalho)
    const lineCell = document.createElement("td");
    lineCell.textContent = departure.line;
    lineCell.style.backgroundColor = departure.bgColor;
    lineCell.style.color = departure.textColor;
    lineCell.style.fontWeight = "bold";
    lineCell.style.padding = "5px 10px";
    lineCell.style.borderRadius = "4px";
    row.appendChild(lineCell);

    // Destino
    const destinationCell = document.createElement("td");
    destinationCell.textContent = departure.destination;
    row.appendChild(destinationCell);

    // Veículo
    const vehicleCell = document.createElement("td");
    vehicleCell.textContent = departure.vehicle;
    vehicleCell.style.fontWeight = "bold";
    row.appendChild(vehicleCell);

    // Plataforma
    const platformCell = document.createElement("td");
    platformCell.textContent = departure.platform;
    platformCell.style.fontWeight = "bold";
    row.appendChild(platformCell);

    // Observação
    const observationCell = document.createElement("td");
    const observationSpan = document.createElement("span");

    const lang = this.scheduleManager.config.language;

    switch (status) {
      case "immediate":
        observationSpan.textContent = translations[lang].immediate;
        observationSpan.className = "immediate rotation-status";
        break;
      case "confirmed":
        observationSpan.textContent = translations[lang].confirmed;
        observationSpan.className = "confirmed rotation-status";
        break;
      case "scheduled":
        observationSpan.textContent = translations[lang].scheduled;
        observationSpan.className = "scheduled rotation-status";
        break;
      case "departed":
        observationSpan.textContent = translations[lang].departed;
        observationSpan.className = "departed rotation-status";
        break;
    }

    observationCell.appendChild(observationSpan);
    row.appendChild(observationCell);

    this.scheduleBodyElement.appendChild(row);
  }

  // Atualizar tabela de partidas
  updateSchedule() {
    if (this.isLoading || !this.scheduleBodyElement) return;

    let departuresToShow;
    let totalDepartures;

    if (this.showAllDepartures) {
      // Mostrar todas as partidas
      departuresToShow = this.scheduleManager.getRemainingDepartures();
      totalDepartures = departuresToShow.length;
    } else {
      // Mostrar apenas as próximas X partidas
      const allDepartures = this.scheduleManager.getRemainingDepartures();
      totalDepartures = allDepartures.length;
      departuresToShow = allDepartures.slice(0, this.maxVisibleRows);
    }

    // Limpar tabela
    this.scheduleBodyElement.innerHTML = "";

    // Verificar se há partidas
    if (departuresToShow.length === 0) {
      if (this.statusMessageElement) {
        this.statusMessageElement.textContent =
          translations[this.scheduleManager.config.language].operationEnded;
        this.statusMessageElement.style.display = "block";
      }
      return;
    } else if (this.statusMessageElement) {
      this.statusMessageElement.style.display = "none";
    }

    // Adicionar partidas à tabela
    departuresToShow.forEach((departure) => {
      const minutesUntil = this.scheduleManager.minutesUntilDeparture(
        departure.time
      );
      const status = this.scheduleManager.getDepartureStatus(departure.time);

      // Não mostrar partidas que já passaram há mais de 1 minuto
      if (minutesUntil < -1) return;

      const row = document.createElement("tr");

      // Hora
      const timeCell = document.createElement("td");
      timeCell.textContent = departure.time;
      row.appendChild(timeCell);

      // Linha
      const lineCell = document.createElement("td");
      lineCell.textContent = departure.line;
      lineCell.style.backgroundColor = departure.bgColor;
      lineCell.style.color = departure.textColor;
      lineCell.style.fontWeight = "bold";
      lineCell.style.padding = "5px 10px";
      lineCell.style.borderRadius = "4px";
      row.appendChild(lineCell);

      // Destino
      const destinationCell = document.createElement("td");
      destinationCell.textContent = departure.destination;
      row.appendChild(destinationCell);

      // Veículo
      const vehicleCell = document.createElement("td");
      vehicleCell.textContent = departure.vehicle;
      row.appendChild(vehicleCell);

      // Plataforma
      const platformCell = document.createElement("td");
      platformCell.textContent = departure.platform;
      row.appendChild(platformCell);

      // Observação
      const observationCell = document.createElement("td");
      const observationSpan = document.createElement("span");

      const lang = this.scheduleManager.config.language;

      switch (status) {
        case "immediate":
          observationSpan.textContent = translations[lang].immediate;
          observationSpan.className = "immediate";
          break;
        case "confirmed":
          observationSpan.textContent = translations[lang].confirmed;
          observationSpan.className = "confirmed";
          break;
        case "scheduled":
          observationSpan.textContent = translations[lang].scheduled;
          observationSpan.className = "scheduled";
          break;
        case "departed":
          observationSpan.textContent = translations[lang].departed;
          observationSpan.className = "departed";
          break;
      }

      observationCell.appendChild(observationSpan);
      row.appendChild(observationCell);

      this.scheduleBodyElement.appendChild(row);
    });

    // Adicionar indicador se não estiver mostrando todas as partidas
    if (!this.showAllDepartures && totalDepartures > this.maxVisibleRows) {
      this.addMoreDeparturesIndicator(totalDepartures, departuresToShow.length);
    }

    // Se não há partidas após o filtro
    if (
      this.scheduleBodyElement.children.length === 0 &&
      this.statusMessageElement
    ) {
      this.statusMessageElement.textContent =
        translations[this.scheduleManager.config.language].operationEnded;
      this.statusMessageElement.style.display = "block";
    }
  }

  // Inicializar aplicação
  async init() {
    this.updateClock();
    this.updateLanguage();

    // Iniciar alternância automática de idioma
    this.startAutoLanguageToggle();

    // Inicializar painel de status das linhas
    this.initializeLinesStatus();

    // Mostrar loading
    this.showLoading(true);

    this.startLineRotation();

    try {
      // Carregar dados dos CSVs
      await this.scheduleManager.loadScheduleData();

      // Inicializar linhas a partir dos horários
      this.initializeLinesFromSchedule();

      // Atualizar botões com o arquivo atual
      const currentFile = this.scheduleManager.csvLoader.getCurrentFile();
      this.updateFileButtons(currentFile);

      this.updateSchedule();

      // Atualizar relógio a cada segundo
      setInterval(() => this.updateClock(), 1000);

      // Atualizar tabela a cada 10 segundos
      setInterval(() => {
        this.updateSchedule();
        this.updateLinesAutoStatus(); // Verificar status automático
      }, this.scheduleManager.config.updateInterval);
    } catch (error) {
      console.error("Erro na inicialização:", error);
      if (this.statusMessageElement) {
        this.statusMessageElement.textContent =
          translations[this.scheduleManager.config.language].operationEnded;
        this.statusMessageElement.style.display = "block";
      }
    } finally {
      this.showLoading(false);
    }
  }
}

// Inicializar aplicação quando a página carregar
document.addEventListener("DOMContentLoaded", () => {
  const app = new BusDeparturesApp();
  app.init();
});
