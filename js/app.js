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

    this.refreshInterval = 30000; // 30 segundos
    this.lastRefreshTime = null;
    this.isRefreshing = false;

    // Elemento de status do refresh
    this.refreshStatusElement = null;
  }

  // Adicione este método para inicializar o sistema de refresh
  initializeRefreshSystem() {
    this.createRefreshStatusElement();
    this.startAutoRefresh();
  }

  // Criar elemento de status do refresh
  createRefreshStatusElement() {
    this.refreshStatusElement = document.createElement("div");
    this.refreshStatusElement.id = "refreshStatus";
    this.refreshStatusElement.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 11px;
            z-index: 1000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
    document.body.appendChild(this.refreshStatusElement);
    this.updateRefreshStatus();
  }

  // Atualizar status do refresh
  updateRefreshStatus() {
    if (!this.refreshStatusElement) return;

    const now = new Date();
    const nextRefresh = new Date(now.getTime() + this.refreshInterval);
    const timeUntilRefresh = Math.max(0, nextRefresh - now);

    const secondsUntil = Math.floor(timeUntilRefresh / 1000);
    const minutes = Math.floor(secondsUntil / 60);
    const seconds = secondsUntil % 60;

    this.refreshStatusElement.innerHTML = `
            🔄 Atualizando em: ${minutes}:${seconds.toString().padStart(2, "0")}
            ${
              this.lastRefreshTime
                ? `<br>📅 Última: ${this.lastRefreshTime.toLocaleTimeString()}`
                : ""
            }
        `;
  }

  // Iniciar auto-refresh
  startAutoRefresh() {
    // Atualizar a cada segundo o contador
    setInterval(() => {
      this.updateRefreshStatus();
    }, 1000);

    // Refresh completo a cada intervalo
    setInterval(() => {
      this.performFullRefresh();
    }, this.refreshInterval);
  }

  // Refresh completo do sistema
  async performFullRefresh() {
    if (this.isRefreshing) return;

    this.isRefreshing = true;
    console.log("🔄 Iniciando refresh completo do sistema...");

    try {
      // 1. Atualizar dados da escala
      await this.refreshScheduleData();

      // 2. Atualizar status das linhas
      this.updateLinesAutoStatus();

      // 3. Atualizar interface
      this.updateSchedule();
      this.updateScheduleInfo();

      // 4. Atualizar horário da última atualização
      this.lastRefreshTime = new Date();

      console.log("✅ Refresh completo concluído");
    } catch (error) {
      console.error("❌ Erro no refresh:", error);
    } finally {
      this.isRefreshing = false;
    }
  }

  // Refresh dos dados da escala
  async refreshScheduleData() {
    try {
      const currentFile = this.scheduleManager.csvLoader.getCurrentFile();
      await this.scheduleManager.loadSelectedFile(currentFile);

      // Re-inicializar dados das linhas
      this.initializeLinesFromSchedule();
    } catch (error) {
      console.error("Erro ao atualizar dados da escala:", error);
    }
  }

  // Modificar o método init() para incluir o sistema de refresh
  async init() {
    this.updateClock();
    this.updateLanguage();

    // Iniciar alternância automática de idioma
    this.startAutoLanguageToggle();

    // Inicializar painel de status das linhas
    this.initializeLinesStatus();

    // Inicializar sistema de refresh
    this.initializeRefreshSystem();

    // Mostrar loading
    this.showLoading(true);

    try {
      // Carregar dados dos CSVs
      await this.scheduleManager.loadScheduleData();

      // Atualizar informações da escala
      this.updateScheduleInfo();

      // Inicializar linhas a partir dos horários
      this.initializeLinesFromSchedule();

      // Atualizar botões com o arquivo atual
      const currentFile = this.scheduleManager.csvLoader.getCurrentFile();
      this.updateFileButtons(currentFile);

      this.updateSchedule();

      // Atualizar relógio a cada segundo
      setInterval(() => this.updateClock(), 1000);

      // Atualizar tabela a cada 10 segundos (mais frequente)
      setInterval(() => {
        this.updateSchedule();
      }, 10000); // Reduzido para 10 segundos

      // Atualizar status das linhas a cada 15 segundos
      setInterval(() => {
        this.updateLinesAutoStatus();
        this.updateLinesDisplay();
      }, 15000);
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
      manualStatus: true,     // ✅ marca que foi escolhido manualmente
      lastUpdate: new Date(),
    });

    this.updateLinesDisplay();
    console.log(`Linha ${lineKey} → status manual: ${newStatus}`);
  }

  // No arquivo app.js, adicione este método à classe BusDeparturesApp
  updateScheduleInfo() {
    const scheduleInfo = this.scheduleManager.csvLoader.getScheduleInfo();
    const infoElement =
      document.getElementById("scheduleInfo") ||
      this.createScheduleInfoElement();

    let infoText = "";
    let icon = "";

    if (scheduleInfo.tipo === "escala_diaria") {
      icon = "📅";
      infoText = `v1.0 - Escala do dia: ${this.formatarDataBr(scheduleInfo.data)} | ${
        scheduleInfo.horarios
      } partidas`;
    } else {
      icon = "📋";
      const nomeModelo = this.getNomeModelo(scheduleInfo.arquivo);
      infoText = `Modelo padrão: ${nomeModelo} | ${scheduleInfo.horarios} horários`;
    }

    // Versão mobile mais compacta
    if (window.innerWidth < 768) {
      if (scheduleInfo.tipo === "escala_diaria") {
        infoText = `${icon} Escala: ${this.formatarDataBr(
          scheduleInfo.data
        )} (${scheduleInfo.horarios} horários)`;
      } else {
        const nomeModelo = this.getNomeModelo(scheduleInfo.arquivo);
        const nomeAbreviado =
          nomeModelo.length > 12
            ? nomeModelo.substring(0, 10) + "..."
            : nomeModelo;
        infoText = `${icon} ${nomeAbreviado} (${scheduleInfo.horarios} horários)`;
      }
    }

    infoElement.textContent = infoText;
    infoElement.className =
      scheduleInfo.tipo === "escala_diaria"
        ? "escala-diaria-indicator"
        : "modelo-padrao-indicator";

    // Garante que está no header em mobile
    if (window.innerWidth < 768) {
      const header = document.querySelector(".header");
      if (header && !infoElement.parentElement === header) {
        header.appendChild(infoElement);
      }
    }
  }

  createScheduleInfoElement() {
    const infoElement = document.createElement("div");
    infoElement.id = "scheduleInfo";

    // Em mobile, adiciona diretamente no header
    if (window.innerWidth < 768) {
      const header = document.querySelector(".header");
      if (header) {
        header.appendChild(infoElement);
      } else {
        document.body.appendChild(infoElement);
      }
    } else {
      document.body.appendChild(infoElement);
    }

    return infoElement;
  }

  formatarDataBr(dataISO) {
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  getNomeModelo(arquivo) {
    const modelos = {
      seg_sex: "Segunda a Sexta",
      sab: "Sábado",
      dom_fer: "Domingo/Feriado",
    };
    return modelos[arquivo] || arquivo;
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
    const div = document.createElement('div');
    div.className = `line-status-item status-${lineData.status || 'normal'}`;
    div.addEventListener('click', () => this.showStatusModal(lineData));

    const statusTexts = {
      pt: { normal: 'OPERAÇÃO NORMAL', reduced: 'VELOCIDADE REDUZIDA', paralyzed: 'PARALISADA', ended: 'ENCERRADA' },
      en: { normal: 'NORMAL OPERATION',  reduced: 'REDUCED SPEED',     paralyzed: 'PARALYZED', ended: 'ENDED' },
    };
    const statusClass = {
      normal: 'status-normal',
      reduced: 'status-reduced',
      paralyzed: 'status-paralyzed',
      ended: 'status-ended',
    };

    const currentLang = lang || 'pt';
    const status = lineData.status || 'normal';

    div.innerHTML = `
      <div class="line-color" style="background-color: ${lineData.bgColor};"></div>
      <div class="line-info">
        <div class="line-number">${lineData.line}</div>
        <div class="line-destination">${lineData.destination}</div>
      </div>
      <div class="line-status ${statusClass[status]}">
        ${statusTexts[currentLang][status]}
        ${lineData.manualStatus ? '<span class="manual-dot" title="Definido manualmente"></span>' : ''}
      </div>
    `;

    return div;
  }

  // Atualizar status automático das linhas com mais inteligência
  updateLinesAutoStatus() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const allDepartures = this.scheduleManager.scheduleData || [];

    // Estatísticas por linha
    const linesStats = new Map();
    allDepartures.forEach((departure) => {
      const [hours, minutes] = departure.time.split(':').map(Number);
      const departureTime = hours * 60 + minutes;
      const lineKey = departure.line;

      if (!linesStats.has(lineKey)) {
        linesStats.set(lineKey, {
          total: 0,
          futuras: 0,
          ultimaPartida: -1,
          emViagem: 0,
        });
      }
      const stats = linesStats.get(lineKey);
      stats.total++;
      if (departureTime > stats.ultimaPartida) stats.ultimaPartida = departureTime;

      const minutesUntil = this.scheduleManager.minutesUntilDeparture(departure.time);
      if (minutesUntil >= 0) stats.futuras++;
      if (this.scheduleManager.isVeiculoEmViagem(departure)) stats.emViagem++;
    });

    // Atualizar cada linha
    this.linesData.forEach((lineData, lineKey) => {
      if (lineData.manualStatus) return; // manual manda

      const stats = linesStats.get(lineKey);
      const isOperationEnded = this.scheduleManager.isLineOperationEnded(lineKey);

      // Sem partidas futuras → encerrada
      if (isOperationEnded || !stats || stats.futuras === 0) {
        if (lineData.status !== 'ended') {
          this.linesData.set(lineKey, {
            ...lineData,
            status: 'ended',
            manualStatus: false,
            lastUpdate: now,
          });
          console.log(`🔄 Linha ${lineKey} encerrada automaticamente`);
        }
      } else {
        // Tem partidas futuras → normal
        if (lineData.status === 'ended') {
          this.linesData.set(lineKey, {
            ...lineData,
            status: 'normal',
            manualStatus: false,
            lastUpdate: now,
          });
          console.log(`🔄 Linha ${lineKey} reativada automaticamente`);
        }
      }
    });

    this.updateLinesDisplay();
  }

  // Método para forçar refresh manual (útil para debugging)
  forceRefresh() {
    console.log("🔄 Refresh manual solicitado");
    this.performFullRefresh();
  }

  // Inicializar dados das linhas a partir dos horários carregados
  initializeLinesFromSchedule() {
    // ✅ Usa TODAS as partidas (inclusive as que já passaram)
    // Antes: getAllUpcomingDepartures() filtrava e sumia com linhas encerradas
    const allDepartures = this.scheduleManager.scheduleData || [];
    const uniqueLines = new Map();

    allDepartures.forEach((departure) => {
      const lineKey = departure.line;
      if (!uniqueLines.has(lineKey)) {
        const isOperationEnded = this.scheduleManager.isLineOperationEnded(lineKey);
        const initialStatus = isOperationEnded ? 'ended' : 'normal';

        uniqueLines.set(lineKey, {
          line: departure.line,
          destination: departure.destination,
          bgColor: departure.bgColor,
          textColor: departure.textColor,
          status: initialStatus,
          manualStatus: false,
        });
      }
    });

    // Manter status existentes (manual ou não)
    uniqueLines.forEach((newLineData, lineKey) => {
      if (this.linesData.has(lineKey)) {
        const existingData = this.linesData.get(lineKey);

        if (existingData.manualStatus) {
          // Status escolhido manualmente pelo CCO → preserva
          newLineData.status = existingData.status;
          newLineData.manualStatus = true;
        } else {
          // Status automático → reavalia
          const isOperationEnded = this.scheduleManager.isLineOperationEnded(lineKey);
          if (isOperationEnded) newLineData.status = 'ended';
          else if (existingData.status === 'ended') newLineData.status = 'normal';
          else newLineData.status = existingData.status;
        }
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

  // Atualizar tabela de partidas
  updateSchedule() {
    if (this.isLoading || !this.scheduleBodyElement) return;

    let departuresToShow;
    let totalDepartures;

    if (this.showAllDepartures) {
      // Mostrar todas as partidas FILTRADAS
      departuresToShow = this.scheduleManager.getFilteredRemainingDepartures();
      totalDepartures = departuresToShow.length;
    } else {
      // Mostrar apenas as próximas X partidas FILTRADAS
      const allDepartures =
        this.scheduleManager.getFilteredRemainingDepartures();
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

  // No método init() do app.js, adicione após o updateSchedule():
  async init() {
    this.updateClock();
    this.updateLanguage();

    // Iniciar alternância automática de idioma
    this.startAutoLanguageToggle();

    // Inicializar painel de status das linhas
    this.initializeLinesStatus();

    // Mostrar loading
    this.showLoading(true);

    try {
      // Carregar dados dos CSVs
      await this.scheduleManager.loadScheduleDataWithRollover();

      // Atualizar informações da escala
      this.updateScheduleInfo();

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
