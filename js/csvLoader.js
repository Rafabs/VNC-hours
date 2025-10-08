// Carregador de arquivos CSV
class CSVLoader {
  constructor() {
    this.data = [];
    this.currentFile = ""; // Arquivo atual selecionado
  }

  // js/csvLoader.js - Método atualizado
  getCSVFileForSelection(selection) {
    // Usar caminhos relativos corretos para GitHub Pages
    const basePath = window.location.hostname.includes("github.io") ? "./" : "";

    switch (selection) {
      case "sab":
        return `${basePath}data/VNC_horario_sab.csv`;
      case "dom_fer":
        return `${basePath}data/VNC_horario_dom_e_fer.csv`;
      case "seg_sex":
      default:
        return `${basePath}data/VNC_horario_seg_sex.csv`;
    }
  }

  // E também atualize o getCSVFileForToday:
  getCSVFileForToday() {
    const basePath = window.location.hostname.includes("github.io") ? "./" : "";
    const today = new Date();
    const dayOfWeek = today.getDay();

    if (dayOfWeek === 0 || this.isHoliday(today)) {
      return `${basePath}data/VNC_horario_dom_e_fer.csv`;
    } else if (dayOfWeek === 6) {
      return `${basePath}data/VNC_horario_sab.csv`;
    } else {
      return `${basePath}data/VNC_horario_seg_sex.csv`;
    }
  }

  // Verificar se é feriado (implementação básica)
  isHoliday(date) {
    // Lista de feriados fixos (dd/mm)
    const fixedHolidays = [
      "01/01", // Ano Novo
      "21/04", // Tiradentes
      "01/05", // Dia do Trabalho
      "07/09", // Independência
      "12/10", // Nossa Senhora
      "02/11", // Finados
      "15/11", // Proclamação da República
      "25/12", // Natal
    ];

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const currentDate = `${day}/${month}`;

    return fixedHolidays.includes(currentDate);
  }

  // Carregar dados do CSV (com opção de arquivo específico)
  async loadCSVData(fileSelection = null) {
    let csvFile;

    if (fileSelection) {
      csvFile = this.getCSVFileForSelection(fileSelection);
      this.currentFile = fileSelection;
    } else {
      csvFile = this.getCSVFileForToday();
      this.currentFile = this.getFileSelectionFromPath(csvFile);
    }

    try {
      const response = await fetch(csvFile);
      if (!response.ok) {
        throw new Error(`Erro ao carregar arquivo: ${response.status}`);
      }

      const csvText = await response.text();
      this.data = this.parseCSV(csvText);
      console.log(
        `Dados carregados de ${csvFile}:`,
        this.data.length,
        "registros"
      );
      return this.data;
    } catch (error) {
      console.error("Erro ao carregar arquivo CSV:", error);
      throw error;
    }
  }

  // Obter seleção de arquivo a partir do caminho
  getFileSelectionFromPath(filePath) {
    if (filePath.includes("sab")) return "sab";
    if (filePath.includes("dom_e_fer")) return "dom_fer";
    return "seg_sex";
  }

  // Parse CSV para JSON
  parseCSV(csvText) {
    const lines = csvText.split("\n").filter((line) => line.trim() !== "");

    if (lines.length === 0) return [];

    // Detectar delimitador (vírgula ou ponto e vírgula)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(";") ? ";" : ",";

    const headers = firstLine
      .split(delimiter)
      .map((header) => header.trim().toLowerCase().replace(/"/g, ""));

    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Processar linha considerando possíveis aspas
      const values = this.parseCSVLine(line, delimiter);

      if (values.length === headers.length) {
        const item = {};
        headers.forEach((header, index) => {
          item[header] = values[index].trim().replace(/"/g, "");
        });
        data.push(item);
      } else {
        console.warn(
          `Linha ${i + 1} ignorada - número de colunas incorreto:`,
          values
        );
      }
    }

    return data;
  }

  // Parse de linha CSV considerando aspas
  parseCSVLine(line, delimiter) {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current);
    return values;
  }

  // Filtrar dados por parada específica (se necessário)
  filterByStop(stopNumber) {
    return this.data.filter((item) => item.parada === stopNumber.toString());
  }

  // Obter todas as paradas únicas
  getUniqueStops() {
    const stops = [...new Set(this.data.map((item) => item.parada))];
    return stops.sort((a, b) => a - b);
  }

  // Obter dados formatados para o painel
  getFormattedData() {
    return this.data.map((item) => ({
      time: item.partida,
      line: item.linha,
      bgColor: item.bg_color || "#2d4059",
      textColor: item.txt_color || "#ffffff",
      destination: item.destino,
      vehicle: item.carro,
      platform: item.parada,
    }));
  }

  // Obter arquivo atual
  getCurrentFile() {
    return this.currentFile;
  }
}
