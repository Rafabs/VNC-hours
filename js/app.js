// Aplicação principal
class BusDeparturesApp {
    constructor() {
        this.scheduleManager = new ScheduleManager();
        this.isLoading = false;
        this.languageInterval = null;
        this.maxVisibleRows = 10; // Máximo de linhas visíveis inicialmente
        this.showAllDepartures = false; // Controla se mostra todas ou apenas as próximas
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        // Elementos DOM
        this.clockElement = document.getElementById('clock');
        this.dateElement = document.getElementById('date'); // Novo elemento da data
        this.clockLabelElement = document.getElementById('clockLabel');
        this.titleElement = document.querySelector('.header-title');
        this.loadingMessageElement = document.getElementById('loadingMessage');
        this.statusMessageElement = document.getElementById('statusMessage');
        this.scheduleBodyElement = document.getElementById('scheduleBody');
        this.fileSelectorElement = document.getElementById('fileSelector');
        this.fileButtons = document.querySelectorAll('.file-btn');
        this.thTimeElement = document.getElementById('thTime');
        this.thLineElement = document.getElementById('thLine');
        this.thDestinationElement = document.getElementById('thDestination');
        this.thVehicleElement = document.getElementById('thVehicle');
        this.thPlatformElement = document.getElementById('thPlatform');
        this.thObservationElement = document.getElementById('thObservation');

        // Verificar se os elementos foram encontrados
        this.validateElements();
    }

    // Validar se todos os elementos necessários existem
    validateElements() {
        const requiredElements = [
            { element: this.clockElement, name: 'clock' },
            { element: this.dateElement, name: 'date' },
            { element: this.titleElement, name: 'header-title' },
            { element: this.loadingMessageElement, name: 'loadingMessage' },
            { element: this.statusMessageElement, name: 'statusMessage' },
            { element: this.scheduleBodyElement, name: 'scheduleBody' },
            { element: this.fileSelectorElement, name: 'fileSelector' }
        ];

        requiredElements.forEach(item => {
            if (!item.element) {
                console.error(`Elemento não encontrado: ${item.name}`);
            }
        });
    }

    setupEventListeners() {
        // Configurar eventos dos botões de arquivo
        this.fileButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const fileSelection = e.target.getAttribute('data-file');
                this.loadSelectedFile(fileSelection);
            });
        });

        // Evento de scroll para carregar mais partidas se necessário
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            tableContainer.addEventListener('scroll', () => {
                this.handleScroll();
            });
        }
    }

    // Manipular scroll para mostrar/ocultar indicador
    handleScroll() {
        const tableContainer = document.querySelector('.table-container');
        if (!tableContainer) return;
        
        const scrollPosition = tableContainer.scrollTop;
        const scrollHeight = tableContainer.scrollHeight;
        const clientHeight = tableContainer.clientHeight;
        
        // Se estiver perto do final, mostrar todas as partidas
        if (scrollPosition + clientHeight >= scrollHeight - 50 && !this.showAllDepartures) {
            this.showAllDepartures = true;
            this.updateSchedule();
        }
    }

    // Mostrar/ocultar loading
    showLoading(show) {
        this.isLoading = show;
        if (this.loadingMessageElement) {
            this.loadingMessageElement.style.display = show ? 'block' : 'none';
        }
        if (show && this.statusMessageElement) {
            this.statusMessageElement.style.display = 'none';
        }
    }

    // Atualizar botões de arquivo ativos
    updateFileButtons(activeFile) {
        this.fileButtons.forEach(button => {
            if (button.getAttribute('data-file') === activeFile) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
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
            console.error('Erro ao carregar arquivo selecionado:', error);
            if (this.statusMessageElement) {
                this.statusMessageElement.textContent = 
                    translations[this.scheduleManager.config.language].operationEnded;
                this.statusMessageElement.style.display = 'block';
            }
        } finally {
            this.showLoading(false);
        }
    }

    // Formatador de data no formato DD/MM/AAAA
    formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    }

    // Atualizar relógio e data
    updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
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
            this.titleElement.textContent = 'VILA NOVA CACHOEIRINHA';
        }
        
        // Atualizar labels da tabela
        if (this.thTimeElement) this.thTimeElement.textContent = translations[lang].thTime;
        if (this.thLineElement) this.thLineElement.textContent = translations[lang].thLine;
        if (this.thDestinationElement) this.thDestinationElement.textContent = translations[lang].thDestination;
        if (this.thVehicleElement) this.thVehicleElement.textContent = translations[lang].thVehicle;
        if (this.thPlatformElement) this.thPlatformElement.textContent = translations[lang].thPlatform;
        if (this.thObservationElement) this.thObservationElement.textContent = translations[lang].thObservation;
        
        // Atualizar label do relógio (se existir)
        if (this.clockLabelElement) {
            this.clockLabelElement.textContent = lang === 'pt' ? 'HORÁRIO ATUAL' : 'CURRENT TIME';
        }
        
        // Atualizar mensagem de loading
        if (this.loadingMessageElement) {
            this.loadingMessageElement.textContent = 
                lang === 'pt' ? 'Carregando dados...' : 'Loading data...';
        }
        
        // Atualizar data com o novo idioma
        this.updateClock();
    }

    // Alternar idioma automaticamente
    startAutoLanguageToggle() {
        // Alternar a cada 30 segundos (30000 ms)
        this.languageInterval = setInterval(() => {
            this.scheduleManager.config.language = 
                this.scheduleManager.config.language === 'pt' ? 'en' : 'pt';
            this.updateLanguage();
            this.updateSchedule();
        }, 30000); // 30 segundos
    }

    // Adicionar indicador de mais partidas
    addMoreDeparturesIndicator(totalDepartures, visibleDepartures) {
        const remaining = totalDepartures - visibleDepartures;
        if (remaining > 0 && this.scheduleBodyElement) {
            const indicatorRow = document.createElement('tr');
            const indicatorCell = document.createElement('td');
            indicatorCell.colSpan = 6;
            indicatorCell.className = 'more-departures';
            
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
        this.scheduleBodyElement.innerHTML = '';
        
        // Verificar se há partidas
        if (departuresToShow.length === 0) {
            if (this.statusMessageElement) {
                this.statusMessageElement.textContent = 
                    translations[this.scheduleManager.config.language].operationEnded;
                this.statusMessageElement.style.display = 'block';
            }
            return;
        } else if (this.statusMessageElement) {
            this.statusMessageElement.style.display = 'none';
        }
        
        // Adicionar partidas à tabela
        departuresToShow.forEach(departure => {
            const minutesUntil = this.scheduleManager.minutesUntilDeparture(departure.time);
            const status = this.scheduleManager.getDepartureStatus(departure.time);
            
            // Não mostrar partidas que já passaram há mais de 1 minuto
            if (minutesUntil < -1) return;
            
            const row = document.createElement('tr');
            
            // Hora
            const timeCell = document.createElement('td');
            timeCell.textContent = departure.time;
            row.appendChild(timeCell);
            
            // Linha
            const lineCell = document.createElement('td');
            lineCell.textContent = departure.line;
            lineCell.style.backgroundColor = departure.bgColor;
            lineCell.style.color = departure.textColor;
            lineCell.style.fontWeight = 'bold';
            lineCell.style.padding = '5px 10px';
            lineCell.style.borderRadius = '4px';
            row.appendChild(lineCell);
            
            // Destino
            const destinationCell = document.createElement('td');
            destinationCell.textContent = departure.destination;
            row.appendChild(destinationCell);
            
            // Veículo
            const vehicleCell = document.createElement('td');
            vehicleCell.textContent = departure.vehicle;
            row.appendChild(vehicleCell);
            
            // Plataforma
            const platformCell = document.createElement('td');
            platformCell.textContent = departure.platform;
            row.appendChild(platformCell);
            
            // Observação
            const observationCell = document.createElement('td');
            const observationSpan = document.createElement('span');
            
            const lang = this.scheduleManager.config.language;
            
            switch(status) {
                case 'immediate':
                    observationSpan.textContent = translations[lang].immediate;
                    observationSpan.className = 'immediate';
                    break;
                case 'confirmed':
                    observationSpan.textContent = translations[lang].confirmed;
                    observationSpan.className = 'confirmed';
                    break;
                case 'scheduled':
                    observationSpan.textContent = translations[lang].scheduled;
                    observationSpan.className = 'scheduled';
                    break;
                case 'departed':
                    observationSpan.textContent = translations[lang].departed;
                    observationSpan.className = 'departed';
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
        if (this.scheduleBodyElement.children.length === 0 && this.statusMessageElement) {
            this.statusMessageElement.textContent = 
                translations[this.scheduleManager.config.language].operationEnded;
            this.statusMessageElement.style.display = 'block';
        }
    }

    // Inicializar aplicação
    async init() {
        this.updateClock();
        this.updateLanguage();
        
        // Iniciar alternância automática de idioma
        this.startAutoLanguageToggle();
        
        // Mostrar loading
        this.showLoading(true);
        
        try {
            // Carregar dados dos CSVs
            await this.scheduleManager.loadScheduleData();
            
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
            console.error('Erro na inicialização:', error);
            if (this.statusMessageElement) {
                this.statusMessageElement.textContent = 
                    translations[this.scheduleManager.config.language].operationEnded;
                this.statusMessageElement.style.display = 'block';
            }
        } finally {
            this.showLoading(false);
        }
    }
}

// Inicializar aplicação quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    const app = new BusDeparturesApp();
    app.init();
});