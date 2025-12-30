// yardmanager.js - VERSÃO CORRIGIDA PARA CONTAGEM DE SLOTS
class YardManager {
  constructor() {
    this.vehicleManager = null;
    this.scheduleManager = null;
    this.waiting5Grid = document.getElementById("waiting5Grid");
    this.waiting10Grid = document.getElementById("waiting10Grid");
    this.reserveGrid = document.getElementById("reserveGrid");
    this.waiting5Count = document.getElementById("waiting5Count");
    this.waiting10Count = document.getElementById("waiting10Count");
    this.reserveCount = document.getElementById("reserveCount");
    this.unavailableCount = document.getElementById("unavailableCount");
    this.nextDepartures5 = document.getElementById("nextDepartures5");
    this.nextDepartures10 = document.getElementById("nextDepartures10");
    this.departureTimes5 = document.getElementById("departureTimes5");
    this.departureTimes10 = document.getElementById("departureTimes10");
    this.reserveFilters = document.getElementById("reserveFilters");
    this.parkedMapping = new Map(); // Chave: Prefixo, Valor: { yardId, laneId, slotIndex }
  }

  async initialize(vehicleManager, scheduleManager) {
    this.vehicleManager = vehicleManager;
    this.scheduleManager = scheduleManager;
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
    console.log(
      "Detalhes dos veículos AGUARDANDO:",
      waitingVehicles.map((v) => ({
        prefixo: v.prefixo,
        tipo: v.tipo,
        proximaViagem: v.proximaViagem,
      }))
    );

    // 2. Obter veículos de RESERVA
    const reserveVehicles = this.vehicleManager.getVehiclesReserva();

    // 3. Obter todos os veículos para encontrar os EM MANUTENÇÃO
    const allVehicles = Array.from(this.vehicleManager.vehicles.values());
    const maintenanceVehicles = allVehicles.filter(
      (v) => v.status === "EM MANUTENÇÃO"
    );

    // 4. Distribuir TODOS os veículos AGUARDANDO nos estacionamentos
    this.distributeWaitingVehicles(waitingVehicles);

    // 5. Atualizar próximas partidas
    this.updateNextDepartures(waitingVehicles);

    // 6. Atualizar grid de reserva
    this.updateReserveGrid(reserveVehicles, maintenanceVehicles);
  }

  distributeWaitingVehicles(waitingVehicles) {
    this.waiting5Grid.innerHTML = "";
    this.waiting10Grid.innerHTML = "";

    // Ordenar por horário de saída (quem sai primeiro ocupa a vala)
    const sorted = [...waitingVehicles].sort((a, b) => {
      const timeA = this.getMinutesUntilDeparture(a.proximaViagem);
      const timeB = this.getMinutesUntilDeparture(b.proximaViagem);
      return timeA - timeB;
    });

    // Configuração dos estacionamentos baseada na sua regra
    const setupLanes = (count) =>
      Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        maxCapacity: 2, // 2 slots (cada padron usa 1, articulado usa 2)
        usedSlots: 0,
        vehicles: [],
      }));

    const yard1 = setupLanes(5); // Estacionamento 1: 5 vias
    const yard2 = setupLanes(10); // Estacionamento 2: 10 vias
    const overflowYard = []; // Recolhidos ao pátio

    sorted.forEach((vehicle) => {
      const isArticulado = /ARTICULAD|SUPER/i.test(vehicle.tipo || "");
      const neededSlots = isArticulado ? 2 : 1;
      let allocated = false;

      // Tenta alocar no Estacionamento 1 primeiro, depois no 2
      for (let yard of [yard1, yard2]) {
        const lane = yard.find(
          (l) => l.maxCapacity - l.usedSlots >= neededSlots
        );
        if (lane) {
          lane.vehicles.push(vehicle);
          lane.usedSlots += neededSlots;
          allocated = true;
          break;
        }
      }

      if (!allocated) {
        overflowYard.push(vehicle);
      }
    });

    // Renderização
    this.renderLanes(yard1, this.waiting5Grid);
    this.renderLanes(yard2, this.waiting10Grid);

    // Atualiza contadores
    this.waiting5Count.textContent = yard1.reduce(
      (acc, l) => acc + l.vehicles.length,
      0
    );
    this.waiting10Count.textContent = yard2.reduce(
      (acc, l) => acc + l.vehicles.length,
      0
    );

    // Transbordamento: Soma os indisponíveis (manutenção) + os que não couberam nas valas
    const maintenanceCount = Array.from(
      this.vehicleManager.vehicles.values()
    ).filter((v) => v.status === "EM MANUTENÇÃO").length;
    this.unavailableCount.textContent = maintenanceCount + overflowYard.length;
  }

  distributeWaitingVehicles(waitingVehicles) {
    // 1. Limpar as grids visualmente, mas manter a lógica de ocupação
    this.waiting5Grid.innerHTML = "";
    this.waiting10Grid.innerHTML = "";

    const yard1 = this.generateLaneStructure(5, 1);
    const yard2 = this.generateLaneStructure(10, 2);
    const allLanes = [...yard1, ...yard2];

    const overflow = [];

    // 2. Tentar manter os veículos que já estavam estacionados em suas vagas
    const stillWaiting = new Set(waitingVehicles.map((v) => v.prefixo));
    for (let [prefix, pos] of this.parkedMapping.entries()) {
      if (!stillWaiting.has(prefix)) {
        this.parkedMapping.delete(prefix); // Remove quem já saiu para viagem
      }
    }

    // 3. Alocar veículos
    waitingVehicles.forEach((vehicle) => {
      const isArticulado = /ARTICULAD|SUPER/i.test(vehicle.tipo || "");
      const neededSlots = isArticulado ? 2 : 1;

      // Se o veículo já tem uma vaga salva, tenta colocar ele lá
      let pos = this.parkedMapping.get(vehicle.prefixo);
      let lane = pos
        ? allLanes.find((l) => l.yardId === pos.yardId && l.id === pos.laneId)
        : null;

      // Se não tem vaga ou a vaga antiga está ocupada por erro, busca nova
      if (!lane || lane.maxCapacity - lane.usedSlots < neededSlots) {
        lane = allLanes.find((l) => l.maxCapacity - l.usedSlots >= neededSlots);

        if (lane) {
          this.parkedMapping.set(vehicle.prefixo, {
            yardId: lane.yardId,
            laneId: lane.id,
          });
        }
      }

      if (lane) {
        lane.vehicles.push(vehicle);
        lane.usedSlots += neededSlots;
      } else {
        overflow.push(vehicle);
      }
    });

    // 4. Renderizar (usando a função de desenho de valas anterior)
    this.renderLanes(yard1, this.waiting5Grid);
    this.renderLanes(yard2, this.waiting10Grid);

    // Atualizar contadores de transbordamento
    this.unavailableCount.textContent =
      overflow.length + (this.maintCount || 0);
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
    lanes.forEach((lane, index) => {
      const laneDiv = document.createElement("div");
      // Adicionamos um número visual para a via
      laneDiv.className = `yard-lane ${lane.usedSlots === 0 ? "empty" : ""}`;
      laneDiv.innerHTML = `<span style="position:absolute; top:2px; left:5px; font-size:10px; color:#444;">VIA ${lane.id}</span>`;

      // Renderiza os veículos presentes
      lane.vehicles.forEach((v) => {
        const isArticulado = /ARTICULAD|SUPER/i.test(v.tipo || "");
        const linhaExibicao =
          v.proximaViagemLinha || v.line || v.linhaAtual || "---";
        const plataformaExibicao = v.proximaPlataforma || v.plataforma || "---";

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

      // PREENCHIMENTO VISUAL: Se sobrar espaço (ex: via tem 1 padron mas cabe 2)
      // Adicionamos um "fantasma" da vaga vazia para manter o layout bonito
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

  renderVehicleInLane(vehicle, container, type) {
    const timeUntil = this.getMinutesUntilDeparture(vehicle.proximaViagem);
    const card = document.createElement("div");
    card.className = "yard-vehicle-card";
    card.setAttribute("data-type", type);

    card.innerHTML = `
        <div class="v-header">
            <span>${vehicle.prefixo}</span>
            <i data-lucide="${
              type === "articulado" ? "truck" : "bus"
            }" style="width:14px"></i>
        </div>
        <div class="v-info">${vehicle.modelo || "Padrão"}</div>
        ${
          vehicle.proximaViagem
            ? `<div class="v-time">Sai às ${vehicle.proximaViagem}</div>`
            : ""
        }
    `;
    container.appendChild(card);
  }

  renderYard(lanes, container, yardNumber) {
    // Filtrar apenas vias que têm veículos
    const occupiedLanes = lanes.filter((lane) => lane.vehicles.length > 0);

    console.log(
      `Estacionamento ${yardNumber}: ${occupiedLanes.length} vias ocupadas`
    );

    occupiedLanes.forEach((lane) => {
      const laneElement = document.createElement("div");
      laneElement.className = `lane occupied ${
        lane.hasArticulado ? "has-articulated" : ""
      }`;

      const slotsHTML = lane.vehicles
        .map(({ vehicle, type }) =>
          this.renderVehicleSlot(vehicle, type, lane.hasArticulado)
        )
        .join("");

      laneElement.innerHTML = `
        <div class="lane-number">Via ${lane.number}</div>
        <div class="lane-slots">
          ${slotsHTML}
        </div>
      `;

      container.appendChild(laneElement);
    });

    // Adicionar vias vazias
    const emptyLanes = lanes.filter((lane) => lane.vehicles.length === 0);
    emptyLanes.forEach((lane) => {
      const emptyLaneElement = document.createElement("div");
      emptyLaneElement.className = "lane";

      // Mostrar 2 slots vazios para vias sem articulado
      const emptySlots = lane.hasArticulado ? 1 : 2;

      emptyLaneElement.innerHTML = `
        <div class="lane-number">Via ${lane.number}</div>
        <div class="lane-slots">
          ${'<div class="vehicle-slot"><div class="vehicle-info">VAGO</div></div>'.repeat(
            emptySlots
          )}
        </div>
      `;

      container.appendChild(emptyLaneElement);
    });
  }

  renderVehicleSlot(vehicle, type, hasArticulado) {
    const minutesUntil = vehicle.proximaViagem
      ? this.getMinutesUntilDeparture(vehicle.proximaViagem)
      : null;

    const vehicleColor = this.getVehicleColor(vehicle.tipo);
    const isArticulado = type === "articulado";

    // Para via com articulado, mostrar apenas 1 slot grande
    if (hasArticulado) {
      return `
        <div class="vehicle-slot occupied articulated" 
             style="${vehicleColor ? `--vehicle-color: ${vehicleColor}` : ""}"
             data-prefixo="${vehicle.prefixo}"
             data-status="AGUARDANDO"
             data-tipo="${vehicle.tipo}">
          <div class="vehicle-info">
            <div class="vehicle-prefix">${vehicle.prefixo}</div>
            <div class="vehicle-line">${vehicle.linhaAtual || "Sem linha"}</div>
            <div class="vehicle-type">${this.formatVehicleType(
              vehicle.tipo
            )}</div>
            ${
              vehicle.proximaViagem
                ? `
              <div class="vehicle-time ${
                minutesUntil <= 30 ? "departing-soon" : ""
              }">
                ${vehicle.proximaViagem}
                ${
                  minutesUntil !== null
                    ? `<br><small>(${minutesUntil} min)</small>`
                    : ""
                }
              </div>
            `
                : ""
            }
          </div>
          <div class="first-trip-indicator">ARTICULADO</div>
          ${
            minutesUntil !== null && minutesUntil <= 30
              ? '<div class="departure-pulse"></div>'
              : ""
          }
          <div class="vehicle-type-indicator type-${this.getVehicleTypeClass(
            vehicle.tipo
          )}"></div>
          ${this.getVehicleTooltip(vehicle, minutesUntil)}
        </div>
      `;
    }

    // Para veículos padrão
    return `
      <div class="vehicle-slot occupied ${type}" 
           style="${vehicleColor ? `--vehicle-color: ${vehicleColor}` : ""}"
           data-prefixo="${vehicle.prefixo}"
           data-status="AGUARDANDO"
           data-tipo="${vehicle.tipo}">
        <div class="vehicle-info">
          <div class="vehicle-prefix">${vehicle.prefixo}</div>
          <div class="vehicle-line">${vehicle.linhaAtual || "Sem linha"}</div>
          <div class="vehicle-type">${this.formatVehicleType(
            vehicle.tipo
          )}</div>
          ${
            vehicle.proximaViagem
              ? `
            <div class="vehicle-time ${
              minutesUntil <= 30 ? "departing-soon" : ""
            }">
              ${vehicle.proximaViagem}
              ${
                minutesUntil !== null
                  ? `<br><small>(${minutesUntil} min)</small>`
                  : ""
              }
            </div>
          `
              : ""
          }
        </div>
        ${
          minutesUntil !== null && minutesUntil <= 30
            ? '<div class="departure-pulse"></div>'
            : ""
        }
        <div class="vehicle-type-indicator type-${this.getVehicleTypeClass(
          vehicle.tipo
        )}"></div>
        ${this.getVehicleTooltip(vehicle, minutesUntil)}
      </div>
    `;
  }

  getVehicleTooltip(vehicle, minutesUntil) {
    return `
      <div class="vehicle-tooltip">
        <div class="tooltip-header">${vehicle.prefixo} - ${vehicle.modelo}</div>
        <div class="tooltip-line">
          <span class="tooltip-label">Status:</span>
          <span class="tooltip-value" style="color: #6f42c1">AGUARDANDO</span>
        </div>
        <div class="tooltip-line">
          <span class="tooltip-label">Tipo:</span>
          <span class="tooltip-value">${vehicle.tipo || "N/A"}</span>
        </div>
        <div class="tooltip-line">
          <span class="tooltip-label">Linha:</span>
          <span class="tooltip-value">${vehicle.linhaAtual || "N/A"}</span>
        </div>
        <div class="tooltip-line">
          <span class="tooltip-label">Plataforma:</span>
          <span class="tooltip-value">${vehicle.plataforma || "N/A"}</span>
        </div>
        ${
          vehicle.proximaViagem
            ? `
          <div class="tooltip-line">
            <span class="tooltip-label">Próxima:</span>
            <span class="tooltip-value">${vehicle.proximaViagem}</span>
          </div>
          <div class="tooltip-line">
            <span class="tooltip-label">Falta:</span>
            <span class="tooltip-value">${minutesUntil} minutos</span>
          </div>
        `
            : ""
        }
        ${
          vehicle.ultimaPartida
            ? `
          <div class="tooltip-line">
            <span class="tooltip-label">Última partida:</span>
            <span class="tooltip-value">${vehicle.ultimaPartida}</span>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  updateNextDepartures(waitingVehicles) {
    // Pegar todas as próximas partidas dos veículos AGUARDANDO
    const allDepartures = waitingVehicles
      .filter((v) => v.proximaViagem)
      .map((v) => ({
        time: v.proximaViagem,
        prefixo: v.prefixo,
        tipo: v.tipo,
        minutes: this.getMinutesUntilDeparture(v.proximaViagem),
      }))
      .sort((a, b) => a.minutes - b.minutes);

    console.log(`Próximas partidas encontradas: ${allDepartures.length}`);

    // Dividir entre os estacionamentos (5 primeiros no 1, próximos no 2)
    const yard1Departures = allDepartures.slice(0, 5);
    const yard2Departures = allDepartures.slice(5, 10);

    // Atualizar displays
    this.departureTimes5.innerHTML = yard1Departures
      .map(
        (d) =>
          `<span class="departure-time" title="${d.prefixo} - ${d.tipo}">${d.time}</span>`
      )
      .join("");

    this.departureTimes10.innerHTML = yard2Departures
      .map(
        (d) =>
          `<span class="departure-time" title="${d.prefixo} - ${d.tipo}">${d.time}</span>`
      )
      .join("");

    // Se não houver partidas
    if (yard1Departures.length === 0) {
      this.departureTimes5.innerHTML =
        '<span class="no-departures">Sem partidas</span>';
    }

    if (yard2Departures.length === 0) {
      this.departureTimes10.innerHTML =
        '<span class="no-departures">Sem partidas</span>';
    }
  }

  updateReserveGrid(reserveVehicles, maintenanceVehicles) {
    const allReserve = [...reserveVehicles, ...maintenanceVehicles];

    this.reserveCount.textContent = reserveVehicles.length;
    this.unavailableCount.textContent = maintenanceVehicles.length;

    console.log(
      `Reserva: ${reserveVehicles.length}, Manutenção: ${maintenanceVehicles.length}`
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
          vehicle.tipo
        )}"></div>
      `;

      this.reserveGrid.appendChild(reserveItem);
    });

    // Criar filtros se não existirem
    if (this.reserveFilters.children.length === 0) {
      this.createReserveFilters();
    }
  }

  createReserveFilters() {
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
    if (!departureTime) return null;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [hours, minutes] = departureTime.split(":").map(Number);
    const departureMinutes = hours * 60 + minutes;

    const diff = departureMinutes - currentTime;
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

// Inicializar quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", async () => {
  const yardManager = new YardManager();

  console.log("Inicializando YardManager...");

  // Aguardar um pouco para que o RoutesApp seja inicializado
  setTimeout(async () => {
    try {
      // Criar managers
      const vehicleManager = new VehicleManager();
      const scheduleManager = new ScheduleManager();

      console.log("Carregando dados dos veículos...");

      // Carregar dados
      await vehicleManager.loadVehicleData();
      await scheduleManager.loadScheduleData();

      console.log(`Veículos carregados: ${vehicleManager.vehicles.size}`);
      console.log(
        `Partidas no schedule: ${
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

        console.log("Veículos atualizados com dados do schedule");
      }

      // Inicializar YardManager
      yardManager.initialize(vehicleManager, scheduleManager);

      console.log("YardManager inicializado com sucesso!");

      // Atualizar periodicamente (a cada 30 segundos)
      setInterval(() => {
        if (
          scheduleManager.scheduleData &&
          scheduleManager.scheduleData.length > 0
        ) {
          vehicleManager.setCurrentScheduleData(scheduleManager.scheduleData);
          vehicleManager.updateVehicleWithSchedule();
          yardManager.updateYardDisplays();
        }
      }, 30000);
    } catch (error) {
      console.error("Erro ao inicializar YardManager:", error);
    }
  }, 2000);
});
