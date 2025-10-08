// Gerenciamento de dados e lógica do cronograma
class ScheduleManager {
    constructor() {
        this.config = {
            immediateThreshold: 4, // minutos para considerar "embarque imediato"
            confirmedThreshold: 6, // minutos para considerar "confirmado"
            updateInterval: 10000, // intervalo de atualização em milissegundos
            language: 'pt' // idioma inicial
        };

        this.csvLoader = new CSVLoader();
        this.scheduleData = [];
    }

    // Carregar dados dos CSVs
    async loadScheduleData(fileSelection = null) {
        try {
            const csvData = await this.csvLoader.loadCSVData(fileSelection);
            this.scheduleData = this.csvLoader.getFormattedData();
            console.log("Dados de partidas carregados:", this.scheduleData.length, "registros");
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
            { time: "08:00", line: "L42-VP2", bgColor: "#FFD966", textColor: "#000000", destination: "ISOLINA MAZZEI (VIA SANTANA)", vehicle: "48-02540", platform: "2" },
            { time: "08:15", line: "L003/10", bgColor: "#806000", textColor: "#FFFFFF", destination: "VILA RICA", vehicle: "P 2034", platform: "3" },
            { time: "08:30", line: "L002/10", bgColor: "#203764", textColor: "#FFFFFF", destination: "METRÔ SANTANA", vehicle: "P 2030", platform: "5" }
        ];
    }

    // Calcular minutos até a partida
    minutesUntilDeparture(departureTime) {
        const now = new Date();
        const [hours, minutes] = departureTime.split(':').map(Number);
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
        
        return this.scheduleData.filter(departure => {
            const [hours, minutes] = departure.time.split(':').map(Number);
            const departureTime = hours * 60 + minutes;
            const minutesUntil = this.minutesUntilDeparture(departure.time);
            
            // Incluir partidas que ainda não ocorreram OU que ocorreram há menos de 1 minuto
            return minutesUntil >= -1;
        });
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
            return 'departed'; // Já partiu
        } else if (minutesUntil <= this.config.immediateThreshold) {
            return 'immediate'; // Embarque imediato (0-4 minutos)
        } else if (minutesUntil <= this.config.confirmedThreshold) {
            return 'confirmed'; // Confirmado (5-6 minutos)
        } else {
            return 'scheduled'; // Previsto (7+ minutos)
        }
    }

    // Obter o nome do arquivo CSV atual
    getCurrentCSVFileName() {
        return this.csvLoader.getCSVFileForToday().split('/').pop();
    }
}