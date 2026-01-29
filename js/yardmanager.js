// yardmanager.js - Adicionar persistência no localStorage

class YardManager {
  constructor() {
    this.vehicleManager = null;
    this.scheduleManager = null;

    // Elementos das grids de valas
    this.waiting5Grid = document.getElementById("waiting5Grid");
    this.waiting10Grid = document.getElementById("waiting10Grid");
    this.reserveGrid = document.getElementById("reserveGrid");

    // Contadores
    this.waiting5Count = document.getElementById("waiting5Count");
    this.waiting10Count = document.getElementById("waiting10Count");
    this.reserveCount = document.getElementById("reserveCount");
    this.unavailableCount = document.getElementById("unavailableCount");

    // Filtros
    this.reserveFilters = document.getElementById("reserveFilters");

    // ✅ PERSISTÊNCIA: Carregar mapeamento salvo do localStorage
    this.parkedMapping = this.loadParkedMapping();

    this.checkElements();
  }

  // ✅ CARREGAR MAPEAMENTO SALVO
  loadParkedMapping() {
    try {
      const saved = localStorage.getItem("yardParkedMapping");
      if (saved) {
        const parsed = JSON.parse(saved);
        const map = new Map();
        Object.entries(parsed).forEach(([key, value]) => {
          map.set(key, value);
        });
        console.log(
          "📂 Mapeamento carregado do localStorage:",
          map.size,
          "veículos",
        );
        return map;
      }
    } catch (error) {
      console.error("Erro ao carregar mapeamento:", error);
    }
    return new Map(); // Retorna mapa vazio se não houver dados salvos
  }

  // ✅ SALVAR MAPEAMENTO
  saveParkedMapping() {
    try {
      const obj = Object.fromEntries(this.parkedMapping.entries());
      localStorage.setItem("yardParkedMapping", JSON.stringify(obj));
    } catch (error) {
      console.error("Erro ao salvar mapeamento:", error);
    }
  }

  // ✅ LIMPAR VAGA QUANDO VEÍCULO SAI
  clearVehicleSlot(prefixo) {
    if (this.parkedMapping.has(prefixo)) {
      this.parkedMapping.delete(prefixo);
      this.saveParkedMapping(); // Salvar alteração
      console.log(`🗑️ Vaga liberada para veículo ${prefixo}`);
    }
  }

  checkElements() {
    const elements = {
      waiting5Grid: this.waiting5Grid,
      waiting10Grid: this.waiting10Grid,
      reserveGrid: this.reserveGrid,
      waiting5Count: this.waiting5Count,
      waiting10Count: this.waiting10Count,
      reserveCount: this.reserveCount,
      unavailableCount: this.unavailableCount,
      reserveFilters: this.reserveFilters,
    };

    for (const [name, element] of Object.entries(elements)) {
      if (!element) {
        console.warn(`Elemento ${name} não encontrado no DOM`);
      }
    }
  }

  async initialize(vehicleManager, scheduleManager) {
    this.vehicleManager = vehicleManager;
    this.scheduleManager = scheduleManager;

    // Inicializar primeiro display
    await this.updateYardDisplays();

    // Atualizar a cada 10 segundos
    setInterval(() => this.updateYardDisplays(), 10000);
  }

  async updateYardDisplays() {
    if (!this.vehicleManager || this.vehicleManager.vehicles.size === 0) {
      console.log("Aguardando dados dos veículos...");
      return;
    }

    // 1. Obter APENAS veículos com status "AGUARDANDO"
    const waitingVehicles = this.vehicleManager.getVehiclesAguardando();
    console.log(`Encontrados ${waitingVehicles.length} veículos AGUARDANDO`);

    // 2. Obter veículos de RESERVA
    const reserveVehicles = this.vehicleManager.getVehiclesReserva();

    // 3. Obter todos os veículos para encontrar os EM MANUTENÇÃO
    const allVehicles = Array.from(this.vehicleManager.vehicles.values());
    const maintenanceVehicles = allVehicles.filter(
      (v) => v.status === "EM MANUTENÇÃO",
    );

    // 4. Distribuir TODOS os veículos AGUARDANDO nos estacionamentos
    this.distributeWaitingVehicles(waitingVehicles);

    // 5. Atualizar grid de reserva
    this.updateReserveGrid(reserveVehicles, maintenanceVehicles);
  }

  // Método para atualizar veículo específico quando termina viagem
  updateVehicleStatus(prefixo, newStatus, tripData = null) {
    const vehicle = this.vehicleManager.vehicles.get(prefixo);
    if (!vehicle) return;

    const oldStatus = vehicle.status;

    // ✅ DISPARAR EVENTO DE MUDANÇA DE STATUS
    if (oldStatus !== newStatus) {
      const statusEvent = new CustomEvent('vehicleStatusChanged', {
        detail: {
          prefixo: prefixo,
          oldStatus: oldStatus,
          newStatus: newStatus,
          timestamp: new Date()
        }
      });
      document.dispatchEvent(statusEvent);
    }

    // ✅ DETECTAR SE O VEÍCULO ESTÁ SAINDO DA VALA (para alinhamento ou viagem)
    const wasInYard =
      oldStatus === "AGUARDANDO" ||
      oldStatus === "NA PLATAFORMA" ||
      oldStatus === "ALINHANDO NA PLATAFORMA";

    const leavingYard =
      wasInYard &&
      (nowInTrip ||
        newStatus === "NA PLATAFORMA" ||
        newStatus === "ALINHANDO NA PLATAFORMA");

    // Se veículo está saindo da vala
    if (leavingYard) {
      console.log(`🚌 Veículo ${prefixo} saindo da vala para ${newStatus}`);
      this.clearVehicleSlot(prefixo); // Limpar a vaga
    }

    // Se veículo acabou de terminar uma viagem
    if (wasInTrip && !nowInTrip && newStatus !== "EM VIAGEM") {
      console.log(`🚌 Veículo ${prefixo} finalizou viagem. Movendo para vala.`);

      // Se tem próxima viagem agendada, manter informações
      if (tripData?.proximaViagem) {
        vehicle.proximaViagem = tripData.proximaViagem;
        vehicle.linhaAtual = tripData.linha;
        vehicle.plataforma = tripData.plataforma;
      }

      // Agora está AGUARDANDO para próxima partida
      vehicle.status = "AGUARDANDO";
      vehicle.categoria = "aguardando";

      // Agendar atualização imediata da interface
      setTimeout(() => {
        this.updateYardDisplays();
      }, 100);
    }

    // Atualizar status do veículo
    vehicle.status = newStatus;

    // Atualizar categoria
    const statusInfo = this.vehicleManager.vehicleStatus[newStatus];
    vehicle.categoria = statusInfo?.category || "aguardando";

    // Se veículo acabou de iniciar viagem
    if (!wasInTrip && nowInTrip) {
      console.log(`🚌 Veículo ${prefixo} iniciou viagem. Removendo da vala.`);

      // Remover do mapeamento de estacionados
      this.clearVehicleSlot(prefixo);

      // Atualizar interface
      setTimeout(() => {
        this.updateYardDisplays();
      }, 100);
    }
  }

  distributeWaitingVehicles(waitingVehicles) {
    // Verificar se os elementos existem
    if (!this.waiting5Grid || !this.waiting10Grid) {
      console.error("Elementos das grids não encontrados");
      return;
    }

    this.waiting5Grid.innerHTML = "";
    this.waiting10Grid.innerHTML = "";

    // ✅ ORDENAÇÃO: Primeiro veículos que já têm vaga alocada, depois os novos
    const sorted = [...waitingVehicles].sort((a, b) => {
      // Veículos com vaga já alocada vêm primeiro (para manter posições)
      const hasSlotA = this.parkedMapping.has(a.prefixo);
      const hasSlotB = this.parkedMapping.has(b.prefixo);

      if (hasSlotA && !hasSlotB) return -1;
      if (!hasSlotA && hasSlotB) return 1;

      // Se ambos têm ou não têm vaga, ordenar por tempo até partida
      const timeA = this.getMinutesUntilDeparture(a.proximaViagem);
      const timeB = this.getMinutesUntilDeparture(b.proximaViagem);

      if (timeA === null && timeB === null) return 0;
      if (timeA === null) return 1;
      if (timeB === null) return -1;

      return timeA - timeB;
    });

    console.log(
      "Veículos ordenados (com vagas mantidas):",
      sorted.map((v) => ({
        prefixo: v.prefixo,
        temVaga: this.parkedMapping.has(v.prefixo),
        vagaAtual: this.parkedMapping.get(v.prefixo),
        proximaViagem: v.proximaViagem,
        minutosAtePartida: this.getMinutesUntilDeparture(v.proximaViagem),
      })),
    );

    // Configuração das valas
    const yard1 = this.generateLaneStructure(5, 1);
    const yard2 = this.generateLaneStructure(10, 2);
    const allLanes = [...yard1, ...yard2];
    const overflow = [];

    // ✅ FASE 1: Colocar veículos que JÁ TÊM VAGA nas suas posições salvas
    sorted.forEach((vehicle) => {
      const isArticulado = /ARTICULAD|SUPER/i.test(vehicle.tipo || "");
      const neededSlots = isArticulado ? 2 : 1;

      const savedPosition = this.parkedMapping.get(vehicle.prefixo);

      if (savedPosition) {
        // Encontrar a vala salva
        const lane = allLanes.find(
          (l) =>
            l.yardId === savedPosition.yardId && l.id === savedPosition.laneId,
        );

        if (lane) {
          // ✅ VERIFICAÇÃO: A vala ainda está disponível para este veículo?
          const hasArticuladoInLane = lane.vehicles.some((v) =>
            /ARTICULAD|SUPER/i.test(v.tipo || ""),
          );

          const compatibilityCheck = this.checkLaneCompatibility(
            lane,
            vehicle,
            neededSlots,
            hasArticuladoInLane,
          );

          if (compatibilityCheck.valid) {
            lane.vehicles.push(vehicle);
            lane.usedSlots += neededSlots;
            console.log(
              `✅ ${vehicle.prefixo} mantido na vala ${lane.yardId}-${lane.id} (posição salva)`,
            );
          } else {
            console.log(
              `⚠️ ${vehicle.prefixo} não pode manter vaga: ${compatibilityCheck.reason}`,
            );
            // Remover mapeamento inválido
            this.parkedMapping.delete(vehicle.prefixo);
            // Será realocado na fase 2
          }
        } else {
          console.log(`⚠️ Vaga salva não encontrada para ${vehicle.prefixo}`);
          this.parkedMapping.delete(vehicle.prefixo);
        }
      }
    });

    // ✅ FASE 2: Alocar veículos que NÃO TÊM VAGA ou perderam a vaga
    sorted.forEach((vehicle) => {
      // Pular veículos já alocados na fase 1
      const alreadyAllocated = allLanes.some((lane) =>
        lane.vehicles.some((v) => v.prefixo === vehicle.prefixo),
      );

      if (alreadyAllocated) return;

      const isArticulado = /ARTICULAD|SUPER/i.test(vehicle.tipo || "");
      const neededSlots = isArticulado ? 2 : 1;

      // Buscar vaga disponível, começando pelas valas mais próximas da saída (menor número)
      let lane = null;

      // Ordenar valas por proximidade (yard1 primeiro, depois yard2, e por número de via)
      const sortedLanes = [...allLanes].sort((a, b) => {
        if (a.yardId !== b.yardId) return a.yardId - b.yardId;
        return a.id - b.id;
      });

      for (const l of sortedLanes) {
        const hasSpace = l.maxCapacity - l.usedSlots >= neededSlots;
        const hasArticuladoInLane = l.vehicles.some((v) =>
          /ARTICULAD|SUPER/i.test(v.tipo || ""),
        );

        const compatibilityCheck = this.checkLaneCompatibility(
          l,
          vehicle,
          neededSlots,
          hasArticuladoInLane,
        );

        if (hasSpace && compatibilityCheck.valid) {
          lane = l;
          break;
        }
      }

      if (lane) {
        lane.vehicles.push(vehicle);
        lane.usedSlots += neededSlots;
        this.parkedMapping.set(vehicle.prefixo, {
          yardId: lane.yardId,
          laneId: lane.id,
        });
        console.log(
          `✅ ${vehicle.prefixo} alocado na vala ${lane.yardId}-${lane.id} (nova alocação)`,
        );
      } else {
        console.log(`❌ ${vehicle.prefixo} não encontrou vaga adequada`);
        overflow.push(vehicle);
      }
    });

    // ✅ Salvar mapeamento atualizado
    this.saveParkedMapping();

    // Renderizar valas
    this.renderLanes(yard1, this.waiting5Grid);
    this.renderLanes(yard2, this.waiting10Grid);

    // Atualizar contadores (com verificação)
    if (this.waiting5Count) {
      const yard1Count = yard1.reduce((acc, l) => acc + l.vehicles.length, 0);
      this.waiting5Count.textContent = yard1Count;
    }

    if (this.waiting10Count) {
      const yard2Count = yard2.reduce((acc, l) => acc + l.vehicles.length, 0);
      this.waiting10Count.textContent = yard2Count;
    }

    // Contar veículos em manutenção para o contador de indisponíveis
    const maintenanceCount = Array.from(
      this.vehicleManager.vehicles.values(),
    ).filter((v) => v.status === "EM MANUTENÇÃO").length;

    if (this.unavailableCount) {
      this.unavailableCount.textContent = maintenanceCount + overflow.length;
    }

    // Log de transbordamento
    if (overflow.length > 0) {
      console.log(
        `🚨 ${overflow.length} veículos não couberam nas valas:`,
        overflow.map((v) => v.prefixo),
      );
    }

    // ✅ LOG DAS VALAS FINAIS
    console.log("Estado final das valas:");
    allLanes.forEach((lane) => {
      if (lane.vehicles.length > 0) {
        console.log(
          `  Vala ${lane.yardId}-${lane.id}: ${lane.vehicles.map((v) => v.prefixo).join(", ")}`,
        );
      } else {
        console.log(`  Vala ${lane.yardId}-${lane.id}: VAZIA`);
      }
    });
  }

  // ✅ MÉTODO AUXILIAR: Verificar compatibilidade da vala
  checkLaneCompatibility(lane, vehicle, neededSlots, hasArticuladoInLane) {
    const isArticulado = neededSlots === 2;

    if (isArticulado && lane.vehicles.length > 0) {
      return { valid: false, reason: "Articulado precisa de vala vazia" };
    }

    if (hasArticuladoInLane && !isArticulado) {
      return {
        valid: false,
        reason: "Não pode colocar padrão em vala com articulado",
      };
    }

    if (lane.usedSlots + neededSlots > lane.maxCapacity) {
      return { valid: false, reason: "Capacidade excedida" };
    }

    return { valid: true, reason: "Compatível" };
  }

  generateLaneStructure(count, yardId) {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      yardId: yardId,
      maxCapacity: 2,
      usedSlots: 0,
      vehicles: [],
    }));
  }

  renderLanes(lanes, container) {
    if (!container) {
      console.error("Container não encontrado para renderizar valas");
      return;
    }

    lanes.forEach((lane) => {
      const laneDiv = document.createElement("div");
      laneDiv.className = `yard-lane ${lane.usedSlots === 0 ? "empty" : ""}`;
      laneDiv.innerHTML = `<span style="position:absolute; top:2px; left:5px; font-size:10px; color:#444;">VIA ${lane.id}</span>`;

      // Renderiza os veículos presentes
      lane.vehicles.forEach((v) => {
        const isArticulado = /ARTICULAD|SUPER/i.test(v.tipo || "");
        const linhaExibicao = v.linhaAtual || "---";
        const plataformaExibicao = v.plataforma || "---";

        const card = document.createElement("div");
        card.className = `yard-vehicle-card ${
          isArticulado ? "articulated" : "padron"
        }`;

        card.innerHTML = `
          <div class="v-row-top">
            <span class="v-prefix" style="font-size:1.1rem; color:#fff;">${
              v.prefixo
            }</span>
            <span class="v-line-badge">${linhaExibicao}</span>
          </div>
          <div class="v-row-mid" style="margin: 8px 0;">
            <div class="v-plat-info">
              <small>PLAT:</small> <strong>${plataformaExibicao}</strong>
            </div>
          </div>
          <div class="v-row-bottom">
            <span class="v-time" style="font-size:1rem;">${
              v.proximaViagem || "--:--"
            }</span>
            <i data-lucide="${
              isArticulado ? "truck" : "bus"
            }" style="width:14px; opacity:0.3"></i>
          </div>
        `;
        laneDiv.appendChild(card);
      });

      // PREENCHIMENTO VISUAL: Se sobrar espaço
      if (lane.usedSlots === 1) {
        const emptySlot = document.createElement("div");
        emptySlot.className = "lane-slot-empty";
        emptySlot.innerHTML = "<span>DISPONÍVEL</span>";
        laneDiv.appendChild(emptySlot);
      }

      container.appendChild(laneDiv);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  updateReserveGrid(reserveVehicles, maintenanceVehicles) {
    if (!this.reserveGrid) {
      console.error("Elemento reserveGrid não encontrado");
      return;
    }

    const allReserve = [...reserveVehicles, ...maintenanceVehicles];

    // Atualizar contadores (com verificação)
    if (this.reserveCount) {
      this.reserveCount.textContent = reserveVehicles.length;
    }

    if (this.unavailableCount) {
      // Já foi atualizado no distributeWaitingVehicles, mas podemos atualizar novamente
      const maintenanceCount = maintenanceVehicles.length;
      this.unavailableCount.textContent = maintenanceCount;
    }

    console.log(
      `Reserva: ${reserveVehicles.length}, Manutenção: ${maintenanceVehicles.length}`,
    );

    this.reserveGrid.innerHTML = "";

    // Mostrar primeiro os veículos de reserva, depois os de manutenção
    allReserve.forEach((vehicle) => {
      const isMaintenance = vehicle.status === "EM MANUTENÇÃO";
      const vehicleType = this.getVehicleType(vehicle.tipo);

      const reserveItem = document.createElement("div");
      reserveItem.className = `reserve-vehicle ${
        isMaintenance ? "maintenance" : "available"
      }`;
      reserveItem.title = `${vehicle.prefixo} - ${vehicle.modelo} - ${vehicle.tipo}`;

      // Buscar próxima viagem (se houver)
      const nextTrip = vehicle.proximaViagem || null;

      reserveItem.innerHTML = `
        <div class="reserve-prefix">${vehicle.prefixo}</div>
        <div class="reserve-model">${vehicle.modelo}</div>
        <div class="reserve-type">${this.formatVehicleType(vehicle.tipo)}</div>
        ${
          nextTrip ? `<div class="reserve-next">Próxima: ${nextTrip}</div>` : ""
        }
        <div class="reserve-status ${
          isMaintenance ? "maintenance" : "available"
        }">
          ${isMaintenance ? "MANUTENÇÃO" : "DISPONÍVEL"}
        </div>
        <div class="vehicle-type-indicator type-${this.getVehicleTypeClass(
          vehicle.tipo,
        )}"></div>
      `;

      this.reserveGrid.appendChild(reserveItem);
    });

    // Criar filtros se não existirem
    if (this.reserveFilters && this.reserveFilters.children.length === 0) {
      this.createReserveFilters();
    }
  }

  createReserveFilters() {
    if (!this.reserveFilters) return;

    this.reserveFilters.innerHTML = `
      <button class="filter-btn active" data-filter="all">Todos</button>
      <button class="filter-btn" data-filter="available">Disponíveis</button>
      <button class="filter-btn" data-filter="maintenance">Manutenção</button>
      <button class="filter-btn" data-filter="padrao">Padrão</button>
      <button class="filter-btn" data-filter="articulado">Articulado</button>
      <button class="filter-btn" data-filter="eletrico">Elétrico</button>
      <button class="filter-btn" data-filter="micro">Micro</button>
    `;

    this.reserveFilters.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const filter = e.target.dataset.filter;

        // Atualizar estado ativo
        this.reserveFilters.querySelectorAll(".filter-btn").forEach((b) => {
          b.classList.remove("active");
        });
        e.target.classList.add("active");

        // Aplicar filtro
        this.applyReserveFilter(filter);
      });
    });
  }

  applyReserveFilter(filter) {
    const vehicles = this.reserveGrid.querySelectorAll(".reserve-vehicle");

    vehicles.forEach((vehicle) => {
      let show = true;

      const typeElement = vehicle.querySelector(".reserve-type");
      const statusElement = vehicle.querySelector(".reserve-status");
      const vehicleType = typeElement
        ? typeElement.textContent.toLowerCase()
        : "";
      const status = statusElement ? statusElement.textContent : "";

      switch (filter) {
        case "available":
          show = vehicle.classList.contains("available");
          break;
        case "maintenance":
          show = vehicle.classList.contains("maintenance");
          break;
        case "padrao":
          show =
            vehicleType.includes("padrão") || vehicleType.includes("padrao");
          break;
        case "articulado":
          show = vehicleType.includes("articulado");
          break;
        case "eletrico":
          show =
            vehicleType.includes("elétrico") ||
            vehicleType.includes("eletrico");
          break;
        case "micro":
          show = vehicleType.includes("micro");
          break;
        // 'all' mostra todos
      }

      vehicle.style.display = show ? "flex" : "none";
    });
  }

  getMinutesUntilDeparture(departureTime) {
    if (!departureTime || departureTime === "--:--") return null;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [hours, minutes] = departureTime.split(":").map(Number);

    if (isNaN(hours) || isNaN(minutes)) return null;

    const departureMinutes = hours * 60 + minutes;
    let diff = departureMinutes - currentTime;

    // Se for negativo mas menos de 12 horas, pode ser partida no dia seguinte
    if (diff < -720) {
      // -12 horas
      diff += 1440; // Adiciona um dia
    }

    return diff > 0 ? diff : 0;
  }

  getVehicleType(tipo) {
    if (!tipo) return "padrão";

    const tipoLower = tipo.toLowerCase();

    if (tipoLower.includes("articulado")) return "articulado";
    if (tipoLower.includes("superarticulado")) return "articulado";
    if (tipoLower.includes("elétrico")) return "elétrico";
    if (tipoLower.includes("eletrico")) return "elétrico";
    if (tipoLower.includes("micro")) return "micro";
    if (tipoLower.includes("padrão")) return "padrão";
    if (tipoLower.includes("padrao")) return "padrão";

    return "padrão";
  }

  getVehicleColor(tipo) {
    const type = this.getVehicleType(tipo);

    switch (type) {
      case "articulado":
        return "#FF9800";
      case "elétrico":
        return "#00BCD4";
      case "micro":
        return "#4CAF50";
      default:
        return "#2196F3";
    }
  }

  getVehicleTypeClass(tipo) {
    const type = this.getVehicleType(tipo);

    switch (type) {
      case "articulado":
        return "articulado";
      case "elétrico":
        return "eletrico";
      case "micro":
        return "micro";
      default:
        return "padrao";
    }
  }

  formatVehicleType(tipo) {
    if (!tipo) return "Padrão";

    const tipoLower = tipo.toLowerCase();

    if (tipoLower.includes("articulado")) {
      return tipoLower.includes("super") ? "Super Articulado" : "Articulado";
    }
    if (tipoLower.includes("elétrico") || tipoLower.includes("eletrico")) {
      return "Elétrico";
    }
    if (tipoLower.includes("micro")) {
      return "Microônibus";
    }
    if (tipoLower.includes("padrão") || tipoLower.includes("padrao")) {
      return "Padrão";
    }

    return tipo;
  }
}

// yardmanager.js - ATUALIZAR A INICIALIZAÇÃO

document.addEventListener("DOMContentLoaded", async () => {
  // ✅ EXPOR GLOBALMENTE
  window.yardManager = new YardManager();

  console.log("🚀 Inicializando Sistema de Pátio...");

  // Aguardar um pouco para que o RoutesApp seja inicializado
  setTimeout(async () => {
    try {
      // Criar managers
      const vehicleManager = new VehicleManager();
      const scheduleManager = new ScheduleManager();

      console.log("📦 Carregando dados dos veículos...");

      // Carregar dados
      await vehicleManager.loadVehicleData();
      await scheduleManager.loadScheduleData();

      console.log(`✅ Veículos carregados: ${vehicleManager.vehicles.size}`);
      console.log(
        `✅ Partidas no schedule: ${
          scheduleManager.scheduleData ? scheduleManager.scheduleData.length : 0
        }`
      );

      // Atualizar veículos com os dados do schedule
      if (
        scheduleManager.scheduleData &&
        scheduleManager.scheduleData.length > 0
      ) {
        vehicleManager.setCurrentScheduleData(scheduleManager.scheduleData);
        vehicleManager.updateVehicleWithSchedule();
        
        // ✅ INICIAR MONITORAMENTO DE STATUS
        if (vehicleManager.startStatusMonitoring) {
          vehicleManager.startStatusMonitoring();
        }

        console.log("✅ Veículos atualizados com dados do schedule");
      }

      // ✅ INICIAR ATUALIZAÇÃO AUTOMÁTICA DO SCHEDULE
      if (scheduleManager.startAutoRefresh) {
        scheduleManager.startAutoRefresh();
      }

      // Inicializar YardManager
      yardManager.initialize(vehicleManager, scheduleManager);

      console.log("🎯 Sistema de pátio totalmente inicializado!");

      // ✅ ADICIONAR BOTÃO DE ATUALIZAÇÃO MANUAL PARA DEBUG
      this.addDebugButton();

    } catch (error) {
      console.error("❌ Erro ao inicializar sistema:", error);
    }
  }, 2000);
});

// ✅ ADICIONAR BOTÃO DE DEBUG
function addDebugButton() {
  const debugBtn = document.createElement('button');
  debugBtn.innerHTML = '🔄 Atualizar Pátio';
  debugBtn.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    z-index: 10000;
    padding: 8px 16px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  
  debugBtn.onclick = () => {
    console.log('🔘 Botão de atualização manual pressionado');
    if (window.yardManager && window.yardManager.performUpdate) {
      window.yardManager.performUpdate();
    }
  };
  
  document.body.appendChild(debugBtn);
  
  // Adicionar também contador de atualizações
  const counterDiv = document.createElement('div');
  counterDiv.id = 'yardUpdateCounter';
  counterDiv.style.cssText = `
    position: fixed;
    bottom: 50px;
    right: 10px;
    z-index: 10000;
    padding: 8px 12px;
    background: rgba(0,0,0,0.8);
    color: white;
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
  `;
  counterDiv.innerHTML = 'Atualizações: 0';
  
  document.body.appendChild(counterDiv);
  
  // Atualizar contador
  setInterval(() => {
    if (window.yardManager) {
      counterDiv.innerHTML = `Atualizações: ${window.yardManager.updateCount || 0}`;
    }
  }, 1000);
}