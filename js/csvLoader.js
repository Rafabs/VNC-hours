// js/csvLoader.js - Versão corrigida
class CSVLoader {
    constructor() {
        this.data = [];
        this.currentFile = '';
    }

    // Determinar qual arquivo carregar baseado no dia da semana
    getCSVFileForToday() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        
        if (dayOfWeek === 0 || this.isHoliday(today)) {
            return 'VNC_horario_dom_e_fer';
        } else if (dayOfWeek === 6) {
            return 'VNC_horario_sab';
        } else {
            return 'VNC_horario_seg_sex';
        }
    }

    // Obter arquivo baseado na seleção do usuário
    getCSVFileForSelection(selection) {
        switch(selection) {
            case 'sab':
                return 'VNC_horario_sab';
            case 'dom_fer':
                return 'VNC_horario_dom_e_fer';
            case 'seg_sex':
            default:
                return 'VNC_horario_seg_sex';
        }
    }

    // Mapear seleção simples para nome do arquivo
    getFileSelectionFromPath(filePath) {
        if (filePath.includes('sab')) return 'sab';
        if (filePath.includes('dom_e_fer')) return 'dom_fer';
        return 'seg_sex';
    }

    // Verificar se é feriado
    isHoliday(date) {
        const fixedHolidays = [
            '01/01', '21/04', '01/05', '07/09', '12/10', '02/11', '15/11', '25/12'
        ];
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return fixedHolidays.includes(`${day}/${month}`);
    }

    // Carregar dados dos arquivos JSON
    async loadCSVData(fileSelection = null) {
        try {
            let fileName;
            
            if (fileSelection) {
                fileName = this.getCSVFileForSelection(fileSelection);
                this.currentFile = fileSelection;
            } else {
                fileName = this.getCSVFileForToday();
                this.currentFile = this.getFileSelectionFromPath(fileName);
            }
            
            const jsonFile = `./data/${fileName}.json`;
            console.log('Carregando arquivo:', jsonFile);
            
            const response = await fetch(jsonFile);
            if (!response.ok) {
                throw new Error(`Erro ao carregar arquivo: ${response.status} - ${jsonFile}`);
            }
            
            const jsonData = await response.json();
            this.data = this.formatData(jsonData);
            console.log(`Dados carregados (${fileName}):`, this.data.length, "registros");
            return this.data;
            
        } catch (error) {
            console.error("Erro ao carregar dados JSON:", error);
            // Fallback para dados básicos
            this.data = this.getFallbackData();
            return this.data;
        }
    }

    // Formatador dos dados JSON para o formato interno
    formatData(jsonData) {
        return jsonData.map(item => ({
            time: item.PARTIDA,
            line: item.LINHA,
            bgColor: item.BG_COLOR,
            textColor: item.TXT_COLOR,
            destination: item.DESTINO,
            vehicle: item.CARRO,
            platform: item.PARADA
        }));
    }

    // Fallback caso JSON não carregue
    getFallbackData() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const baseTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        
        return [
            { time: this.addMinutes(baseTime, 2), line: "L42-VP2", bgColor: "#FFD966", textColor: "#000000", destination: "ISOLINA MAZZEI (VIA SANTANA)", vehicle: "48-02540", platform: "2" },
            { time: this.addMinutes(baseTime, 5), line: "L003/10", bgColor: "#806000", textColor: "#FFFFFF", destination: "VILA RICA", vehicle: "P 2034", platform: "3" },
            { time: this.addMinutes(baseTime, 8), line: "L002/10", bgColor: "#203764", textColor: "#FFFFFF", destination: "METRÔ SANTANA", vehicle: "P 2030", platform: "5" }
        ];
    }

    addMinutes(time, minutesToAdd) {
        const [hours, minutes] = time.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes + minutesToAdd, 0, 0);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    getFormattedData() {
        return this.data;
    }

    getCurrentFile() {
        return this.currentFile;
    }
}