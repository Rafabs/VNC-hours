class YardManager {
  constructor() {
    // Verificar se as dependências estão carregadas
    if (typeof ScheduleManager === "undefined") {
      console.error("❌ ScheduleManager não está definido!");
      return;
    }

    if (typeof VehicleManager === "undefined") {
      console.error("❌ VehicleManager não está definido!");
      return;
    }

    this.scheduleManager = new ScheduleManager();
    this.vehicleManager = new VehicleManager();

    // Elementos dos ESTACIONAMENTOS
    this.parking1Grid = document.getElementById("waiting5Grid");
    this.parking2Grid = document.getElementById("waiting10Grid");
    this.parking1Count = document.getElementById("waiting5Count");
    this.parking2Count = document.getElementById("waiting10Count");

    // Elementos de reserva
    this.reserveGrid = document.getElementById("reserveGrid");
    this.reserveFilters = document.getElementById("reserveFilters");
    this.reserveCount = document.getElementById("reserveCount");
    this.unavailableCount = document.getElementById("unavailableCount");

    this.currentFilter = "all";
    this.garagemFilter = "VILA NOVA CACHOEIRINHA";

    // Verificar se os elementos DOM existem
    if (!this.parking1Grid || !this.parking2Grid) {
      console.error("❌ Elementos DOM não encontrados!");
      return;
    }

    this.init();
  }

  async init() {
    try {
      console.log("🚀 Iniciando YardManager...");

      await this.scheduleManager.loadScheduleData();
      await this.vehicleManager.loadVehicleData();

      if (
        this.scheduleManager.scheduleData &&
        this.scheduleManager.scheduleData.length > 0
      ) {
        this.vehicleManager.setCurrentScheduleData(
          this.scheduleManager.scheduleData
        );
        this.vehicleManager.updateVehicleWithSchedule();
      }

      this.convertCardsToParking();
      this.renderYard();
      this.renderReserveFilters();
      this.startRealtimeUpdate();

      console.log("✅ YardManager inicializado com sucesso");
    } catch (error) {
      console.error("❌ Erro na inicialização do YardManager:", error);
    }
  }

  // CONVERTER OS CARDS DE AGUARDANDO PARA ESTACIONAMENTOS
  convertCardsToParking() {
    try {
      // Card 1 - 5 Vias → Estacionamento 1
      const card1 = this.parking1Grid.closest(".yard-card");
      if (card1) {
        const card1Header = card1.querySelector(".yard-card-header h3");
        const card1Stats = card1.querySelector(".capacity");
        const card1Info = card1.querySelector(".waiting-info");

        if (card1Header) {
          card1Header.innerHTML =
            '<i data-lucide="square-parking"></i> Estacionamento 1 - 5 Vias';
        }
        if (card1Stats) {
          card1Stats.textContent = "Capacidade: 10 Padrão / 5 Articulado";
        }

        if (card1Info) {
          card1Info.innerHTML = `
            <div class="parking-info">
              <span>Veículos que retornaram da viagem</span>
              <div class="parking-status empty" id="parking1Status">Vazio</div>
            </div>
          `;
        }
      }

      // Card 2 - 10 Vias → Estacionamento 2
      const card2 = this.parking2Grid.closest(".yard-card");
      if (card2) {
        const card2Header = card2.querySelector(".yard-card-header h3");
        const card2Stats = card2.querySelector(".capacity");
        const card2Info = card2.querySelector(".waiting-info");

        if (card2Header) {
          card2Header.innerHTML =
            '<i data-lucide="square-parking"></i> Estacionamento 2 - 10 Vias';
        }
        if (card2Stats) {
          card2Stats.textContent = "Capacidade: 20 Padrão / 10 Articulado";
        }

        if (card2Info) {
          card2Info.innerHTML = `
            <div class="parking-info">
              <span>Veículos que retornaram da viagem</span>
              <div class="parking-status empty" id="parking2Status">Vazio</div>
            </div>
          `;
        }
      }

      // Atualizar ícones Lucide
      if (window.lucide) {
        lucide.createIcons();
      }
    } catch (error) {
      console.error("❌ Erro ao converter cards para estacionamentos:", error);
    }
  }

  // IDENTIFICAR VEÍCULOS PARA ESTACIONAMENTO (APENAS CONCLUSÃO DE VIAGEM E PRIMEIRA VIAGEM)
  getVehiclesForParking() {
    const parkingVehicles = [];

    if (!this.vehicleManager || !this.vehicleManager.vehicles) {
      console.warn("⚠️ VehicleManager não disponível");
      return parkingVehicles;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    console.log(
      `🔍 Buscando veículos para estacionamento às ${now.getHours()}:${now.getMinutes()}`
    );

    this.vehicleManager.vehicles.forEach((vehicle) => {
      console.log(
        `📝 Analisando ${vehicle.prefixo}: status=${vehicle.status}, ultimaPartida=${vehicle.ultimaPartida}, proximaViagem=${vehicle.proximaViagem}`
      );

      // ✅ CRITÉRIO 1: Veículos que CONCLUÍRAM viagem (retornaram ao pátio)
      if (vehicle.ultimaPartida) {
        const [hours, minutes] = vehicle.ultimaPartida.split(":").map(Number);
        const partidaTime = hours * 60 + minutes;
        const duracaoTotal = vehicle.duracaoViagem || 90;
        const retornoTime = partidaTime + duracaoTotal;

        console.log(
          `   ${vehicle.prefixo}: partiu ${
            vehicle.ultimaPartida
          }, duração ${duracaoTotal}min, retorno ${this.formatTimeFromMinutes(
            retornoTime
          )}`
        );

        // Se já passou do horário de retorno, vai para estacionamento
        if (currentTime > retornoTime && vehicle.status !== "EM VIAGEM") {
          parkingVehicles.push({
            ...vehicle,
            parkingReason: "concluiu_viagem",
            timeSinceReturn: currentTime - retornoTime,
          });
          console.log(
            `🔄 ${vehicle.prefixo} CONCLUIU VIAGEM - vai para estacionamento`
          );
        } else if (vehicle.status === "EM VIAGEM") {
          console.log(`   ${vehicle.prefixo} ainda está EM VIAGEM`);
        } else {
          console.log(
            `   ${vehicle.prefixo} ainda não retornou (current: ${currentTime}, retorno: ${retornoTime})`
          );
        }
      }

      // ✅ CRITÉRIO 2: Veículos que vão iniciar a PRIMEIRA VIAGEM do dia
      if (
        vehicle.status === "AGUARDANDO" &&
        vehicle.proximaViagem &&
        !vehicle.ultimaPartida
      ) {
        console.log(
          `   ${vehicle.prefixo} está AGUARDANDO e tem próxima viagem, verificando se é primeira...`
        );

        const isFirstTrip = this.isFirstTripOfDay(
          vehicle.prefixo,
          this.scheduleManager.scheduleData
        );

        if (isFirstTrip) {
          parkingVehicles.push({
            ...vehicle,
            parkingReason: "primeira_viagem",
            timeSinceReturn: null,
          });
          console.log(
            `🚀 ${vehicle.prefixo} PRIMEIRA VIAGEM DO DIA - vai para estacionamento`
          );
        } else {
          console.log(`   ${vehicle.prefixo} não é primeira viagem do dia`);
        }
      }

      // ✅ CRITÉRIO 3: Veículos que estão como RESERVA mas têm viagem programada (backup)
      if (vehicle.status === "RESERVA" && vehicle.proximaViagem) {
        const minutosAtePartida = this.getMinutesUntil(vehicle.proximaViagem);
        if (minutosAtePartida > 60) {
          // Se a partida é em mais de 1 hora
          parkingVehicles.push({
            ...vehicle,
            parkingReason: "reserva_com_viagem",
            timeSinceReturn: null,
          });
          console.log(
            `⏰ ${vehicle.prefixo} RESERVA com viagem futura (${minutosAtePartida}min) - vai para estacionamento`
          );
        }
      }
    });

    console.log(
      `📊 TOTAL de veículos para estacionamento: ${parkingVehicles.length}`
    );
    console.log(
      `📋 Lista:`,
      parkingVehicles.map((v) => `${v.prefixo} (${v.parkingReason})`)
    );
    return parkingVehicles;
  }

  // VERIFICAR SE É A PRIMEIRA VIAGEM DO DIA (MELHORADO)
  isFirstTripOfDay(vehiclePrefix, scheduleData) {
    if (!scheduleData || scheduleData.length === 0) {
      console.log(`   ${vehiclePrefix}: sem dados de horário`);
      return false;
    }

    // Encontrar TODAS as viagens do veículo ordenadas por horário
    const allTrips = scheduleData
      .filter((departure) => {
        const match =
          departure.vehicle.toUpperCase() === vehiclePrefix.toUpperCase();
        if (match) {
          console.log(
            `   ${vehiclePrefix}: encontrada viagem ${departure.time} - ${departure.line}`
          );
        }
        return match;
      })
      .map((departure) => {
        const [hours, minutes] = departure.time.split(":").map(Number);
        return {
          time: hours * 60 + minutes,
          departure: departure,
        };
      })
      .sort((a, b) => a.time - b.time);

    if (allTrips.length === 0) {
      console.log(`   ${vehiclePrefix}: nenhuma viagem encontrada no schedule`);
      return false;
    }

    // A primeira viagem é a mais cedo do dia
    const primeiraViagem = allTrips[0];

    // Verificar se o veículo tem esta viagem como próxima
    const vehicle = this.vehicleManager.vehicles.get(vehiclePrefix);
    if (vehicle && vehicle.proximaViagem) {
      const [proxHours, proxMinutes] = vehicle.proximaViagem
        .split(":")
        .map(Number);
      const proxTime = proxHours * 60 + proxMinutes;

      const isPrimeira = proxTime === primeiraViagem.time;

      if (isPrimeira) {
        console.log(
          `🔍 ${vehiclePrefix}: É a PRIMEIRA viagem do dia às ${primeiraViagem.departure.time}`
        );
      } else {
        console.log(
          `   ${vehiclePrefix}: Não é primeira viagem (próxima: ${vehicle.proximaViagem}, primeira: ${primeiraViagem.departure.time})`
        );
      }

      return isPrimeira;
    }

    console.log(`   ${vehiclePrefix}: sem próxima viagem definida`);
    return false;
  }

  // ADICIONAR MÉTODO PARA FORMATAR HORÁRIO
  formatTimeFromMinutes(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  }

  // Calcular minutos até a partida
  getMinutesUntil(timeString) {
    if (!timeString) return 999;
    const now = new Date();
    const [hours, minutes] = timeString.split(":").map(Number);
    const targetTime = new Date();
    targetTime.setHours(hours, minutes, 0, 0);
    const diffMs = targetTime - now;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return Math.max(0, diffMinutes);
  }

  renderYard() {
    try {
      this.renderParkingAreas();
      this.renderReserveVehicles();
      this.updateCounters();
    } catch (error) {
      console.error("❌ Erro ao renderizar yard:", error);
    }
  }

  // RENDERIZAR OS 2 ESTACIONAMENTOS
  renderParkingAreas() {
    const parkingVehicles = this.getVehiclesForParking();

    console.log("🚗 Veículos para estacionamento:", parkingVehicles.length);

    // SEPARAR VEÍCULOS POR TIPO
    const articulatedVehicles = parkingVehicles.filter(
      (v) =>
        this.detectVehicleType(v.prefixo, v.modelo, v.tipo).type ===
          "articulado" ||
        this.detectVehicleType(v.prefixo, v.modelo, v.tipo).type ===
          "superarticulado"
    );

    const standardVehicles = parkingVehicles.filter(
      (v) =>
        this.detectVehicleType(v.prefixo, v.modelo, v.tipo).type !==
          "articulado" &&
        this.detectVehicleType(v.prefixo, v.modelo, v.tipo).type !==
          "superarticulado"
    );

    console.log(
      `Articulados: ${articulatedVehicles.length}, Padrão: ${standardVehicles.length}`
    );

    // ESTACIONAMENTO 1: 5 vias (5 articulados OU 10 padrão)
    this.renderParkingCard(
      this.parking1Grid,
      articulatedVehicles.slice(0, 5),
      standardVehicles.slice(0, 10),
      5,
      "parking1"
    );

    // ESTACIONAMENTO 2: 10 vias (10 articulados OU 20 padrão)
    this.renderParkingCard(
      this.parking2Grid,
      articulatedVehicles.slice(5, 15),
      standardVehicles.slice(10, 30),
      10,
      "parking2"
    );

    // Atualizar contadores
    const parking1Total =
      Math.min(articulatedVehicles.slice(0, 5).length, 5) +
      Math.min(standardVehicles.slice(0, 10).length, 10);
    const parking2Total =
      Math.min(articulatedVehicles.slice(5, 15).length, 10) +
      Math.min(standardVehicles.slice(10, 30).length, 20);

    if (this.parking1Count) this.parking1Count.textContent = parking1Total;
    if (this.parking2Count) this.parking2Count.textContent = parking2Total;

    // Atualizar status de disponibilidade
    this.updateParkingStatus(parking1Total, parking2Total);
  }

  updateParkingStatus(parking1Total, parking2Total) {
    const status1 = document.getElementById("parking1Status");
    const status2 = document.getElementById("parking2Status");

    if (status1) {
      status1.textContent =
        parking1Total > 0 ? `${parking1Total} veículos` : "Vazio";
      status1.className = `parking-status ${
        parking1Total > 0 ? "occupied" : "empty"
      }`;
    }

    if (status2) {
      status2.textContent =
        parking2Total > 0 ? `${parking2Total} veículos` : "Vazio";
      status2.className = `parking-status ${
        parking2Total > 0 ? "occupied" : "empty"
      }`;
    }
  }

  renderParkingCard(
    container,
    articulatedVehicles,
    standardVehicles,
    laneCount,
    type
  ) {
    if (!container) {
      console.error("❌ Container não encontrado:", type);
      return;
    }

    // Limpar container mantendo a estrutura CSS existente
    container.innerHTML = "";
    container.className = `yard-grid ${
      type === "parking1" ? "waiting-5-grid" : "waiting-10-grid"
    }`;

    // Criar vias do estacionamento
    for (let i = 1; i <= laneCount; i++) {
      const lane = document.createElement("div");
      lane.className = "lane double-capacity";
      lane.innerHTML = `
        <div class="lane-number">Via ${i}</div>
        <div class="lane-slots"></div>
      `;
      container.appendChild(lane);
    }

    // Alocar veículos nas vias
    this.allocateToParkingLanes(
      container,
      articulatedVehicles,
      standardVehicles,
      laneCount,
      type
    );
  }

  allocateToParkingLanes(
    container,
    articulatedVehicles,
    standardVehicles,
    laneCount,
    type
  ) {
    console.log(
      `=== ALOCANDO NO ESTACIONAMENTO ${type === "parking1" ? "1" : "2"} ===`
    );
    console.log(
      `Articulados: ${articulatedVehicles.length}, Padrão: ${standardVehicles.length}`
    );

    let artIndex = 0;
    let stdIndex = 0;

    // PRIMEIRO: Aloca articulados (1 por via - ocupam via inteira)
    for (
      let laneIndex = 0;
      laneIndex < laneCount && artIndex < articulatedVehicles.length;
      laneIndex++
    ) {
      const lane = container.children[laneIndex];
      const vehicle = articulatedVehicles[artIndex];

      this.fillParkingSlot(lane, vehicle, laneIndex + 1, true);
      console.log(
        `🚛 Articulado no Estacionamento ${type === "parking1" ? "1" : "2"}: ${
          vehicle.prefixo
        } na via ${laneIndex + 1}`
      );
      artIndex++;
    }

    // DEPOIS: Aloca veículos padrão nas vias sem articulados
    for (
      let laneIndex = 0;
      laneIndex < laneCount && stdIndex < standardVehicles.length;
      laneIndex++
    ) {
      const lane = container.children[laneIndex];

      // Verifica se a via já tem articulado
      const hasArticulated = lane.querySelector(".vehicle-slot.articulated");

      // Se a via não tem articulado, pode colocar 2 veículos padrão
      if (!hasArticulated) {
        const laneSlots = lane.querySelector(".lane-slots");

        for (
          let slot = 0;
          slot < 2 && stdIndex < standardVehicles.length;
          slot++
        ) {
          const vehicle = standardVehicles[stdIndex];
          this.fillParkingSlot(lane, vehicle, laneIndex + 1, false, slot + 1);
          console.log(
            `🚌 Padrão no Estacionamento ${type === "parking1" ? "1" : "2"}: ${
              vehicle.prefixo
            } na via ${laneIndex + 1}, posição ${slot + 1}`
          );
          stdIndex++;
        }
      }
    }

    console.log(
      `✅ Estacionamento ${
        type === "parking1" ? "1" : "2"
      } alocado: ${artIndex} articulados + ${stdIndex} padrão`
    );
  }

  fillParkingSlot(
    lane,
    vehicle,
    laneNumber,
    isArticulated = false,
    position = null
  ) {
    const vehicleType = this.detectVehicleType(
      vehicle.prefixo,
      vehicle.modelo,
      vehicle.tipo
    );
    const timeSinceReturn = this.getTimeSinceReturn(vehicle);
    const parkingReason = vehicle.parkingReason || "concluiu_viagem";

    const slot = document.createElement("div");
    slot.className = `vehicle-slot occupied ${
      isArticulated ? "articulated" : "standard"
    } ${vehicleType.type} ${parkingReason}`;

    // Cor do veículo baseada no prefixo
    const vehicleColor = this.getVehicleColor(vehicle.prefixo);
    slot.style.setProperty("--vehicle-color", vehicleColor);

    const slotContent = document.createElement("div");
    slotContent.className = "vehicle-info";

    // Texto diferente para primeira viagem vs conclusão de viagem
    const statusText =
      parkingReason === "primeira_viagem" ? "PRIMEIRA VIAGEM" : "ESTACIONADO";
    const reasonText =
      parkingReason === "primeira_viagem"
        ? `Parte: ${vehicle.proximaViagem}`
        : `Retornou: ${timeSinceReturn}`;

    slotContent.innerHTML = `
      <div class="vehicle-tooltip">
        <div class="tooltip-header">${vehicle.prefixo}</div>
        <div class="tooltip-line">
          <span class="tooltip-label">Status:</span>
          <span class="tooltip-value">${statusText}</span>
        </div>
        <div class="tooltip-line">
          <span class="tooltip-label">Linha:</span>
          <span class="tooltip-value">${vehicle.linhaAtual || "—"}</span>
        </div>
        <div class="tooltip-line">
          <span class="tooltip-label">${
            parkingReason === "primeira_viagem" ? "Partida" : "Retorno"
          }:</span>
          <span class="tooltip-value">${reasonText}</span>
        </div>
        <div class="tooltip-line">
          <span class="tooltip-label">Via:</span>
          <span class="tooltip-value">${laneNumber}${
      position ? `-${position}` : ""
    }</span>
        </div>
      </div>
      <div class="vehicle-prefix">${vehicle.prefixo}</div>
      <div class="vehicle-line">${vehicle.linhaAtual || "—"}</div>
      <div class="vehicle-time">${reasonText}</div>
      <div class="vehicle-type-badge">${this.getTypeAbbreviation(
        vehicleType.type
      )}</div>
      <div class="vehicle-type-indicator type-${vehicleType.type}"></div>
      ${
        parkingReason === "primeira_viagem"
          ? '<div class="first-trip-indicator">1ª</div>'
          : ""
      }
    `;

    slot.appendChild(slotContent);

    if (isArticulated) {
      // Articulado ocupa a via inteira
      lane.appendChild(slot);
      // Marcar que esta via tem articulado
      lane.classList.add("has-articulated");
    } else {
      // Padrão vai nos slots da via
      const laneSlots = lane.querySelector(".lane-slots");
      if (laneSlots) {
        laneSlots.appendChild(slot);
      } else {
        lane.appendChild(slot);
      }
    }

    slot.addEventListener("click", () => this.showVehicleModal(vehicle));
  }

  // CALCULAR TEMPO DESDE O RETORNO
  getTimeSinceReturn(vehicle) {
    if (!vehicle.ultimaPartida) return "—";

    const now = new Date();
    const [hours, minutes] = vehicle.ultimaPartida.split(":").map(Number);
    const partidaTime = new Date();
    partidaTime.setHours(hours, minutes, 0, 0);

    const duracaoTotal = vehicle.duracaoViagem || 90;
    const retornoTime = new Date(partidaTime.getTime() + duracaoTotal * 60000);

    const diffMs = now - retornoTime;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 0) return "Ainda em viagem";
    if (diffMinutes < 60) return `${diffMinutes} min`;

    const hoursSince = Math.floor(diffMinutes / 60);
    const minsSince = diffMinutes % 60;
    return `${hoursSince}h${minsSince > 0 ? ` ${minsSince}min` : ""}`;
  }

  // Gerar cor baseada no prefixo do veículo
  getVehicleColor(prefixo) {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E9",
      "#F8C471",
      "#82E0AA",
      "#F1948A",
      "#85C1E9",
      "#D7BDE2",
    ];
    let hash = 0;
    for (let i = 0; i < prefixo.length; i++) {
      hash = prefixo.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // MÉTODOS DE RESERVA - VEÍCULOS SEM VIAGEM
  renderReserveFilters() {
    if (!this.reserveFilters) return;

    this.reserveFilters.innerHTML = `
      <button class="filter-btn active" data-filter="all">Todos</button>
      <button class="filter-btn" data-filter="available">Disponíveis</button>
      <button class="filter-btn" data-filter="unavailable">Indisponíveis</button>
    `;

    this.reserveFilters.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const filter = e.target.dataset.filter;
        this.setFilter(filter);
      });
    });
  }

  setFilter(filter) {
    this.currentFilter = filter;
    if (this.reserveFilters) {
      this.reserveFilters.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
      });
    }
    this.renderReserveVehicles();
  }

  renderReserveVehicles() {
    if (!this.reserveGrid) return;

    // ✅ VEÍCULOS DE RESERVA: APENAS veículos SEM viagem programada ou com viagem muito distante
    const parkingVehicles = this.getVehiclesForParking();
    const parkingPrefixes = new Set(parkingVehicles.map((v) => v.prefixo));

    const reserveVehicles = Array.from(this.vehicleManager.vehicles.values())
      .filter((vehicle) => {
        const isInParking = parkingPrefixes.has(vehicle.prefixo);
        const hasSoonTrip =
          vehicle.proximaViagem &&
          this.getMinutesUntil(vehicle.proximaViagem) <= 60;
        const isActive =
          vehicle.status === "EM VIAGEM" ||
          vehicle.status === "NA PLATAFORMA" ||
          vehicle.status === "ALINHANDO NA PLATAFORMA";

        // É reserva se: não está no estacionamento, não tem viagem próxima e não está ativo
        const isReserve = !isInParking && !hasSoonTrip && !isActive;

        if (isReserve) {
          console.log(
            `📋 ${vehicle.prefixo} é RESERVA: status=${vehicle.status}, proxima=${vehicle.proximaViagem}`
          );
        }

        return isReserve;
      })
      .sort((a, b) => a.prefixo.localeCompare(b.prefixo));

    console.log(`📋 TOTAL Veículos de reserva: ${reserveVehicles.length}`);

    // Aplicar filtro
    let filteredVehicles = reserveVehicles;
    if (this.currentFilter === "available") {
      filteredVehicles = reserveVehicles.filter(
        (v) => v.status !== "EM MANUTENÇÃO"
      );
    } else if (this.currentFilter === "unavailable") {
      filteredVehicles = reserveVehicles.filter(
        (v) => v.status === "EM MANUTENÇÃO"
      );
    }

    this.renderReserveGrid(filteredVehicles);
  }

  renderReserveGrid(vehicles) {
    if (!this.reserveGrid) return;

    this.reserveGrid.innerHTML = "";

    if (vehicles.length === 0) {
      this.reserveGrid.innerHTML = `
        <div class="no-vehicles-message">
          <i data-lucide="car" class="no-vehicles-icon"></i>
          <span>Todos os veículos estão alocados</span>
        </div>
      `;
      return;
    }

    vehicles.forEach((vehicle) => {
      const vehicleElement = document.createElement("div");
      const statusClass =
        vehicle.status === "EM MANUTENÇÃO" ? "unavailable" : "available";
      const statusText =
        vehicle.status === "EM MANUTENÇÃO" ? "MANUTENÇÃO" : "RESERVA";
      const vehicleType = this.detectVehicleType(
        vehicle.prefixo,
        vehicle.modelo,
        vehicle.tipo
      );

      vehicleElement.className = `reserve-vehicle ${statusClass}`;
      vehicleElement.innerHTML = `
        <div class="reserve-prefix">${vehicle.prefixo}</div>
        <div class="reserve-model">${vehicle.modelo || "N/A"}</div>
        <div class="reserve-status ${statusClass}">${statusText}</div>
        <div class="next-trip">${vehicle.proximaViagem || "Sem viagem"}</div>
        <div class="vehicle-type-indicator type-${vehicleType.type}"></div>
      `;

      vehicleElement.addEventListener("click", () =>
        this.showVehicleModal(vehicle)
      );
      this.reserveGrid.appendChild(vehicleElement);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  updateCounters() {
    const parkingVehicles = this.getVehiclesForParking();
    const reserveVehicles = Array.from(
      this.vehicleManager.vehicles.values()
    ).filter(
      (vehicle) =>
        vehicle.status === "RESERVA" &&
        !parkingVehicles.some((pv) => pv.prefixo === vehicle.prefixo)
    );

    if (this.reserveCount)
      this.reserveCount.textContent = reserveVehicles.length;
    if (this.unavailableCount) {
      this.unavailableCount.textContent = Array.from(
        this.vehicleManager.vehicles.values()
      ).filter((vehicle) => vehicle.status === "EM MANUTENÇÃO").length;
    }
  }

  // MÉTODOS AUXILIARES
  detectVehicleType(vehicleStr = "", model = "", type = "") {
    const searchString = (vehicleStr + " " + model + " " + type).toLowerCase();

    if (/superarticulado|23m|bi.art/i.test(searchString)) {
      return { type: "superarticulado", icon: "truck" };
    }
    if (/articulado|artic|art\./i.test(searchString)) {
      return { type: "articulado", icon: "truck" };
    }
    if (/eletrico|e-|spark/i.test(searchString)) {
      return { type: "eletrico", icon: "zap" };
    }
    if (/micro|van|midi/i.test(searchString)) {
      return { type: "micro", icon: "shopping-bag" };
    }
    return { type: "padrao", icon: "bus" };
  }

  getTypeAbbreviation(type) {
    const abbreviations = {
      padrao: "PAD",
      articulado: "ART",
      superarticulado: "ART",
      micro: "MIC",
      eletrico: "ELET",
    };
    return abbreviations[type] || "PAD";
  }

  showVehicleModal(vehicle) {
    const modal = document.getElementById("vehicleModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");

    if (!modal || !modalTitle || !modalBody) {
      console.warn("Modal não encontrado no HTML");
      return;
    }

    modalTitle.textContent = `Veículo ${vehicle.prefixo}`;

    const statusBadge =
      vehicle.status === "EM MANUTENÇÃO"
        ? '<span class="status-badge unavailable">MANUTENÇÃO</span>'
        : `<span class="status-badge available">${vehicle.status}</span>`;

    modalBody.innerHTML = `
      <div class="vehicle-details">
        ${statusBadge}
        <div class="detail-item"><strong>Prefixo:</strong> ${
          vehicle.prefixo
        }</div>
        <div class="detail-item"><strong>Modelo:</strong> ${
          vehicle.modelo || "—"
        }</div>
        <div class="detail-item"><strong>Tipo:</strong> ${
          vehicle.tipo || "—"
        }</div>
        <div class="detail-item"><strong>Placa:</strong> ${
          vehicle.placa || "—"
        }</div>
        <div class="detail-item"><strong>Status:</strong> ${
          vehicle.status
        }</div>
        ${
          vehicle.linhaAtual
            ? `<div class="detail-item"><strong>Última Linha:</strong> ${vehicle.linhaAtual}</div>`
            : ""
        }
        ${
          vehicle.proximaViagem
            ? `<div class="detail-item"><strong>Próxima Viagem:</strong> ${vehicle.proximaViagem}</div>`
            : ""
        }
        ${
          vehicle.ultimaPartida
            ? `<div class="detail-item"><strong>Partida Anterior:</strong> ${vehicle.ultimaPartida}</div>`
            : ""
        }
      </div>
    `;

    modal.classList.add("active");

    const closeModal = document.getElementById("closeModal");
    if (closeModal) {
      closeModal.onclick = () => modal.classList.remove("active");
    }

    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    };
  }

  startRealtimeUpdate() {
    setInterval(async () => {
      try {
        await this.scheduleManager.loadScheduleData();

        if (
          this.scheduleManager.scheduleData &&
          this.scheduleManager.scheduleData.length > 0
        ) {
          this.vehicleManager.setCurrentScheduleData(
            this.scheduleManager.scheduleData
          );
          this.vehicleManager.updateVehicleWithSchedule();
          this.renderYard();
        }
      } catch (error) {
        console.error("Erro na atualização em tempo real:", error);
      }
    }, 10000);
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (
      typeof VehicleManager !== "undefined" &&
      typeof ScheduleManager !== "undefined"
    ) {
      new YardManager();
      if (window.lucide) {
        lucide.createIcons();
      }
    } else {
      console.error(
        "❌ Dependências não carregadas. Verifique a ordem dos scripts."
      );
    }
  }, 100);
});
