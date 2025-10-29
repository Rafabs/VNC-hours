class CSVLoader {
  constructor() {
    this.data = [];
    this.currentFile = "";
  }

  // Formatar data para o padrão dd_mm_yyyy
  formatarDataParaArquivo(data) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}_${mes}_${ano}`;
  }

  // Obter data atual no formato yyyy-mm-dd
  getDataAtual() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  // Determinar qual arquivo carregar baseado na data atual
  getCSVFileForToday() {
    const dataAtual = this.getDataAtual();
    const nomeArquivo = `${this.formatarDataParaArquivo(
      dataAtual
    )}_tabela_horaria`;
    return nomeArquivo;
  }

  // Obter arquivo baseado na seleção do usuário (mantido para compatibilidade)
  getCSVFileForSelection(selection) {
    const dataAtual = this.getDataAtual();

    switch (selection) {
      case "sab":
        return "VNC_horario_sab_model";
      case "dom_fer":
        return "VNC_horario_dom_e_fer_model";
      case "seg_sex":
      default:
        return "VNC_horario_seg_sex_model";
    }
  }

  // Mapear seleção simples para nome do arquivo
  getFileSelectionFromPath(filePath) {
    if (filePath.includes("sab")) return "sab";
    if (filePath.includes("dom_e_fer")) return "dom_fer";
    return "seg_sex";
  }

  // Verificar se é feriado (mantido para referência)
  isHoliday(date) {
    const fixedHolidays = [
      "01/01",
      "21/04",
      "01/05",
      "07/09",
      "12/10",
      "02/11",
      "15/11",
      "25/12",
    ];
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return fixedHolidays.includes(`${day}/${month}`);
  }

  // Carregar dados dos arquivos JSON - PRIORIDADE PARA ESCALAS DIÁRIAS
  async loadCSVData(fileSelection = null) {
    try {
      let fileName;
      let usarEscalaDiaria = false;

      // PRIMEIRO: Tentar carregar a escala do dia atual
      const escalaDiaria = this.getCSVFileForToday();
      const caminhoEscalaDiaria = `./data/${escalaDiaria}.json`;

      console.log("🔍 Buscando escala diária:", caminhoEscalaDiaria);

      try {
        const responseEscala = await fetch(caminhoEscalaDiaria);
        if (responseEscala.ok) {
          const jsonDataEscala = await responseEscala.json();
          this.data = this.formatData(jsonDataEscala);
          this.currentFile = "escala_diaria";
          usarEscalaDiaria = true;
          console.log(
            `✅ Escala diária carregada: ${this.data.length} horários`
          );
        }
      } catch (error) {
        console.log("ℹ️  Escala diária não encontrada, usando modelo padrão");
      }

      // SEGUNDO: Se não encontrou escala diária, usar modelo padrão
      if (!usarEscalaDiaria) {
        if (fileSelection) {
          fileName = this.getCSVFileForSelection(fileSelection);
          this.currentFile = fileSelection;
        } else {
          fileName = this.getCSVFileForToday(); // Isso agora retorna o modelo padrão
          this.currentFile = this.getFileSelectionFromPath(fileName);
        }

        const jsonFile = `./data/${fileName}.json`;
        console.log("📁 Carregando arquivo modelo:", jsonFile);

        const response = await fetch(jsonFile);
        if (!response.ok) {
          throw new Error(
            `Erro ao carregar arquivo: ${response.status} - ${jsonFile}`
          );
        }

        const jsonData = await response.json();
        this.data = this.formatData(jsonData);
        console.log(
          `📊 Dados modelo carregados (${fileName}):`,
          this.data.length,
          "registros"
        );
      }

      return this.data;
    } catch (error) {
      console.error("❌ Erro ao carregar dados JSON:", error);
      // Fallback para dados básicos
      this.data = this.getFallbackData();
      return this.data;
    }
  }

  // Formatador dos dados JSON para o formato interno
  formatData(jsonData) {
    return jsonData.map((item) => ({
      time: item.PARTIDA,
      line: item.LINHA,
      bgColor: item.BG_COLOR,
      textColor: item.TXT_COLOR,
      destination: item.DESTINO,
      vehicle: item.CARRO,
      platform: item.PARADA,
      duracao: parseInt(item.DURACAO) || 45, // Default 45 minutos se não houver
    }));
  }

  // Fallback caso JSON não carregue
  getFallbackData() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const baseTime = `${String(currentHour).padStart(2, "0")}:${String(
      currentMinute
    ).padStart(2, "0")}`;

    return [
      {
        time: this.addMinutes(baseTime, 2),
        line: "L42-VP2",
        bgColor: "#FFD966",
        textColor: "#000000",
        destination: "ISOLINA MAZZEI (VIA SANTANA)",
        vehicle: "48-02540",
        platform: "2",
        duracao: 50,
      },
      {
        time: this.addMinutes(baseTime, 5),
        line: "L003/10",
        bgColor: "#806000",
        textColor: "#FFFFFF",
        destination: "VILA RICA",
        vehicle: "P 2034",
        platform: "3",
        duracao: 45,
      },
      {
        time: this.addMinutes(baseTime, 8),
        line: "L002/10",
        bgColor: "#203764",
        textColor: "#FFFFFF",
        destination: "METRÔ SANTANA",
        vehicle: "P 2030",
        platform: "5",
        duracao: 40,
      },
    ];
  }

  addMinutes(time, minutesToAdd) {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes + minutesToAdd, 0, 0);
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  }

  getFormattedData() {
    return this.data;
  }

  getCurrentFile() {
    return this.currentFile;
  }

  // Novo método para verificar se está usando escala diária
  isUsingDailySchedule() {
    return this.currentFile === "escala_diaria";
  }

  // Novo método para obter informações da escala atual
  getScheduleInfo() {
    const dataAtual = this.getDataAtual();

    if (this.isUsingDailySchedule()) {
      return {
        tipo: "escala_diaria",
        data: dataAtual,
        arquivo: `${this.formatarDataParaArquivo(
          dataAtual
        )}_tabela_horaria.json`,
        horarios: this.data.length,
      };
    } else {
      return {
        tipo: "modelo_padrao",
        data: dataAtual,
        arquivo: this.currentFile,
        horarios: this.data.length,
      };
    }
  }
}
