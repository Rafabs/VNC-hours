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
    console.log("Detalhes dos veículos AGUARDANDO:", waitingVehicles.map(v => ({
      prefixo: v.prefixo,
      tipo: v.tipo,
      proximaViagem: v.proximaViagem
    })));
    
    // 2. Obter veículos de RESERVA
    const reserveVehicles = this.vehicleManager.getVehiclesReserva();
    
    // 3. Obter todos os veículos para encontrar os EM MANUTENÇÃO
    const allVehicles = Array.from(this.vehicleManager.vehicles.values());
    const maintenanceVehicles = allVehicles.filter(v => 
      v.status === "EM MANUTENÇÃO"
    );

    // 4. Distribuir TODOS os veículos AGUARDANDO nos estacionamentos
    this.distributeWaitingVehicles(waitingVehicles);
    
    // 5. Atualizar próximas partidas
    this.updateNextDepartures(waitingVehicles);
    
    // 6. Atualizar grid de reserva
    this.updateReserveGrid(reserveVehicles, maintenanceVehicles);
  }

  distributeWaitingVehicles(waitingVehicles) {
    // Limpar grids
    this.waiting5Grid.innerHTML = '';
    this.waiting10Grid.innerHTML = '';
    
    // Ordenar veículos por tempo até a partida (se tiver próxima viagem)
    const sortedVehicles = waitingVehicles.sort((a, b) => {
      if (!a.proximaViagem && !b.proximaViagem) return 0;
      if (!a.proximaViagem) return 1;
      if (!b.proximaViagem) return -1;
      
      const aTime = this.getMinutesUntilDeparture(a.proximaViagem);
      const bTime = this.getMinutesUntilDeparture(b.proximaViagem);
      return aTime - bTime;
    });

    console.log(`Distribuindo ${sortedVehicles.length} veículos AGUARDANDO`);
    
    // Estacionamento 1: 5 vias, capacidade 10 padrão ou 5 articulado
    const yard1Lanes = Array(5).fill().map((_, i) => ({
      number: i + 1,
      maxSlots: 2, // 2 veículos padrão por via
      slots: 2, // Slots disponíveis
      vehicles: [],
      hasArticulado: false
    }));
    
    // Estacionamento 2: 10 vias, capacidade 20 padrão ou 10 articulado
    const yard2Lanes = Array(10).fill().map((_, i) => ({
      number: i + 1,
      maxSlots: 2,
      slots: 2,
      vehicles: [],
      hasArticulado: false
    }));
    
    let waiting5Vehicles = 0; // Contador de veículos no estacionamento 1
    let waiting10Vehicles = 0; // Contador de veículos no estacionamento 2
    
    // Função para encontrar uma via disponível
    const findAvailableLane = (lanes, isArticulado) => {
      for (let lane of lanes) {
        if (isArticulado) {
          // Para articulado: precisa de via COMPLETAMENTE vazia
          if (lane.slots === lane.maxSlots && !lane.hasArticulado) {
            return lane;
          }
        } else {
          // Para padrão: precisa de pelo menos 1 slot disponível
          if (lane.slots > 0 && !lane.hasArticulado) {
            return lane;
          }
        }
      }
      return null;
    };
    
    // Alocar TODOS os veículos AGUARDANDO
    sortedVehicles.forEach(vehicle => {
      const vehicleType = this.getVehicleType(vehicle.tipo);
      const isArticulado = vehicleType === 'articulado';
      
      // Primeiro tentar no estacionamento 1
      let lane = findAvailableLane(yard1Lanes, isArticulado);
      let yard = 1;
      
      if (!lane) {
        // Se não couber no 1, tentar no 2
        lane = findAvailableLane(yard2Lanes, isArticulado);
        yard = 2;
      }
      
      if (lane) {
        lane.vehicles.push({ vehicle, type: vehicleType });
        if (isArticulado) {
          lane.slots = 0; // Articulado ocupa TODOS os slots da via
          lane.hasArticulado = true;
        } else {
          lane.slots -= 1; // Padrão ocupa 1 slot
        }
        
        if (yard === 1) {
          waiting5Vehicles += 1; // Conta 1 veículo (independente do tipo)
        } else {
          waiting10Vehicles += 1; // Conta 1 veículo (independente do tipo)
        }
        
        console.log(`Alocado ${vehicle.prefixo} (${vehicleType}) na Via ${lane.number} do Estacionamento ${yard}`);
      } else {
        console.warn(`Veículo ${vehicle.prefixo} (${vehicleType}) não coube nos estacionamentos`);
      }
    });

    // Renderizar estacionamento 1
    this.renderYard(yard1Lanes, this.waiting5Grid, 1);
    
    // Renderizar estacionamento 2
    this.renderYard(yard2Lanes, this.waiting10Grid, 2);
    
    // Atualizar contadores - AGORA CORRETO: conta VEÍCULOS, não slots
    this.waiting5Count.textContent = waiting5Vehicles;
    this.waiting10Count.textContent = waiting10Vehicles;
    
    console.log(`Alocados: Estacionamento 1: ${waiting5Vehicles} veículos, Estacionamento 2: ${waiting10Vehicles} veículos`);
    console.log("Capacidade ocupada:", {
      yard1: yard1Lanes.map(l => ({ 
        via: l.number, 
        slotsLivres: l.slots, 
        hasArticulado: l.hasArticulado, 
        veiculos: l.vehicles.map(v => v.vehicle.prefixo) 
      })),
      yard2: yard2Lanes.map(l => ({ 
        via: l.number, 
        slotsLivres: l.slots, 
        hasArticulado: l.hasArticulado, 
        veiculos: l.vehicles.map(v => v.vehicle.prefixo) 
      }))
    });
  }

  renderYard(lanes, container, yardNumber) {
    // Filtrar apenas vias que têm veículos
    const occupiedLanes = lanes.filter(lane => lane.vehicles.length > 0);
    
    console.log(`Estacionamento ${yardNumber}: ${occupiedLanes.length} vias ocupadas`);
    
    occupiedLanes.forEach(lane => {
      const laneElement = document.createElement('div');
      laneElement.className = `lane occupied ${lane.hasArticulado ? 'has-articulated' : ''}`;
      
      const slotsHTML = lane.vehicles.map(({ vehicle, type }) => 
        this.renderVehicleSlot(vehicle, type, lane.hasArticulado)
      ).join('');
      
      laneElement.innerHTML = `
        <div class="lane-number">Via ${lane.number}</div>
        <div class="lane-slots">
          ${slotsHTML}
        </div>
      `;
      
      container.appendChild(laneElement);
    });
    
    // Adicionar vias vazias
    const emptyLanes = lanes.filter(lane => lane.vehicles.length === 0);
    emptyLanes.forEach(lane => {
      const emptyLaneElement = document.createElement('div');
      emptyLaneElement.className = 'lane';
      
      // Mostrar 2 slots vazios para vias sem articulado
      const emptySlots = lane.hasArticulado ? 1 : 2;
      
      emptyLaneElement.innerHTML = `
        <div class="lane-number">Via ${lane.number}</div>
        <div class="lane-slots">
          ${'<div class="vehicle-slot"><div class="vehicle-info">VAGO</div></div>'.repeat(emptySlots)}
        </div>
      `;
      
      container.appendChild(emptyLaneElement);
    });
  }

  renderVehicleSlot(vehicle, type, hasArticulado) {
    const minutesUntil = vehicle.proximaViagem ? 
      this.getMinutesUntilDeparture(vehicle.proximaViagem) : null;
    
    const vehicleColor = this.getVehicleColor(vehicle.tipo);
    const isArticulado = type === 'articulado';
    
    // Para via com articulado, mostrar apenas 1 slot grande
    if (hasArticulado) {
      return `
        <div class="vehicle-slot occupied articulated" 
             style="${vehicleColor ? `--vehicle-color: ${vehicleColor}` : ''}"
             data-prefixo="${vehicle.prefixo}"
             data-status="AGUARDANDO"
             data-tipo="${vehicle.tipo}">
          <div class="vehicle-info">
            <div class="vehicle-prefix">${vehicle.prefixo}</div>
            <div class="vehicle-line">${vehicle.linhaAtual || 'Sem linha'}</div>
            <div class="vehicle-type">${this.formatVehicleType(vehicle.tipo)}</div>
            ${vehicle.proximaViagem ? `
              <div class="vehicle-time ${minutesUntil <= 30 ? 'departing-soon' : ''}">
                ${vehicle.proximaViagem}
                ${minutesUntil !== null ? `<br><small>(${minutesUntil} min)</small>` : ''}
              </div>
            ` : ''}
          </div>
          <div class="first-trip-indicator">ARTICULADO</div>
          ${minutesUntil !== null && minutesUntil <= 30 ? '<div class="departure-pulse"></div>' : ''}
          <div class="vehicle-type-indicator type-${this.getVehicleTypeClass(vehicle.tipo)}"></div>
          ${this.getVehicleTooltip(vehicle, minutesUntil)}
        </div>
      `;
    }
    
    // Para veículos padrão
    return `
      <div class="vehicle-slot occupied ${type}" 
           style="${vehicleColor ? `--vehicle-color: ${vehicleColor}` : ''}"
           data-prefixo="${vehicle.prefixo}"
           data-status="AGUARDANDO"
           data-tipo="${vehicle.tipo}">
        <div class="vehicle-info">
          <div class="vehicle-prefix">${vehicle.prefixo}</div>
          <div class="vehicle-line">${vehicle.linhaAtual || 'Sem linha'}</div>
          <div class="vehicle-type">${this.formatVehicleType(vehicle.tipo)}</div>
          ${vehicle.proximaViagem ? `
            <div class="vehicle-time ${minutesUntil <= 30 ? 'departing-soon' : ''}">
              ${vehicle.proximaViagem}
              ${minutesUntil !== null ? `<br><small>(${minutesUntil} min)</small>` : ''}
            </div>
          ` : ''}
        </div>
        ${minutesUntil !== null && minutesUntil <= 30 ? '<div class="departure-pulse"></div>' : ''}
        <div class="vehicle-type-indicator type-${this.getVehicleTypeClass(vehicle.tipo)}"></div>
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
          <span class="tooltip-value">${vehicle.tipo || 'N/A'}</span>
        </div>
        <div class="tooltip-line">
          <span class="tooltip-label">Linha:</span>
          <span class="tooltip-value">${vehicle.linhaAtual || 'N/A'}</span>
        </div>
        <div class="tooltip-line">
          <span class="tooltip-label">Plataforma:</span>
          <span class="tooltip-value">${vehicle.plataforma || 'N/A'}</span>
        </div>
        ${vehicle.proximaViagem ? `
          <div class="tooltip-line">
            <span class="tooltip-label">Próxima:</span>
            <span class="tooltip-value">${vehicle.proximaViagem}</span>
          </div>
          <div class="tooltip-line">
            <span class="tooltip-label">Falta:</span>
            <span class="tooltip-value">${minutesUntil} minutos</span>
          </div>
        ` : ''}
        ${vehicle.ultimaPartida ? `
          <div class="tooltip-line">
            <span class="tooltip-label">Última partida:</span>
            <span class="tooltip-value">${vehicle.ultimaPartida}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  updateNextDepartures(waitingVehicles) {
    // Pegar todas as próximas partidas dos veículos AGUARDANDO
    const allDepartures = waitingVehicles
      .filter(v => v.proximaViagem)
      .map(v => ({
        time: v.proximaViagem,
        prefixo: v.prefixo,
        tipo: v.tipo,
        minutes: this.getMinutesUntilDeparture(v.proximaViagem)
      }))
      .sort((a, b) => a.minutes - b.minutes);

    console.log(`Próximas partidas encontradas: ${allDepartures.length}`);

    // Dividir entre os estacionamentos (5 primeiros no 1, próximos no 2)
    const yard1Departures = allDepartures.slice(0, 5);
    const yard2Departures = allDepartures.slice(5, 10);

    // Atualizar displays
    this.departureTimes5.innerHTML = yard1Departures
      .map(d => `<span class="departure-time" title="${d.prefixo} - ${d.tipo}">${d.time}</span>`)
      .join('');

    this.departureTimes10.innerHTML = yard2Departures
      .map(d => `<span class="departure-time" title="${d.prefixo} - ${d.tipo}">${d.time}</span>`)
      .join('');

    // Se não houver partidas
    if (yard1Departures.length === 0) {
      this.departureTimes5.innerHTML = '<span class="no-departures">Sem partidas</span>';
    }

    if (yard2Departures.length === 0) {
      this.departureTimes10.innerHTML = '<span class="no-departures">Sem partidas</span>';
    }
  }

  updateReserveGrid(reserveVehicles, maintenanceVehicles) {
    const allReserve = [...reserveVehicles, ...maintenanceVehicles];
    
    this.reserveCount.textContent = reserveVehicles.length;
    this.unavailableCount.textContent = maintenanceVehicles.length;
    
    console.log(`Reserva: ${reserveVehicles.length}, Manutenção: ${maintenanceVehicles.length}`);
    
    this.reserveGrid.innerHTML = '';
    
    // Mostrar primeiro os veículos de reserva, depois os de manutenção
    allReserve.forEach(vehicle => {
      const isMaintenance = vehicle.status === "EM MANUTENÇÃO";
      const vehicleType = this.getVehicleType(vehicle.tipo);
      
      const reserveItem = document.createElement('div');
      reserveItem.className = `reserve-vehicle ${isMaintenance ? 'maintenance' : 'available'}`;
      reserveItem.title = `${vehicle.prefixo} - ${vehicle.modelo} - ${vehicle.tipo}`;
      
      // Buscar próxima viagem (se houver)
      const nextTrip = vehicle.proximaViagem || null;
      
      reserveItem.innerHTML = `
        <div class="reserve-prefix">${vehicle.prefixo}</div>
        <div class="reserve-model">${vehicle.modelo}</div>
        <div class="reserve-type">${this.formatVehicleType(vehicle.tipo)}</div>
        ${nextTrip ? `<div class="reserve-next">Próxima: ${nextTrip}</div>` : ''}
        <div class="reserve-status ${isMaintenance ? 'maintenance' : 'available'}">
          ${isMaintenance ? 'MANUTENÇÃO' : 'DISPONÍVEL'}
        </div>
        <div class="vehicle-type-indicator type-${this.getVehicleTypeClass(vehicle.tipo)}"></div>
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
    
    this.reserveFilters.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        
        // Atualizar estado ativo
        this.reserveFilters.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.remove('active');
        });
        e.target.classList.add('active');
        
        // Aplicar filtro
        this.applyReserveFilter(filter);
      });
    });
  }

  applyReserveFilter(filter) {
    const vehicles = this.reserveGrid.querySelectorAll('.reserve-vehicle');
    
    vehicles.forEach(vehicle => {
      let show = true;
      
      const typeElement = vehicle.querySelector('.reserve-type');
      const statusElement = vehicle.querySelector('.reserve-status');
      const vehicleType = typeElement ? typeElement.textContent.toLowerCase() : '';
      const status = statusElement ? statusElement.textContent : '';
      
      switch(filter) {
        case 'available':
          show = vehicle.classList.contains('available');
          break;
        case 'maintenance':
          show = vehicle.classList.contains('maintenance');
          break;
        case 'padrao':
          show = vehicleType.includes('padrão') || vehicleType.includes('padrao');
          break;
        case 'articulado':
          show = vehicleType.includes('articulado');
          break;
        case 'eletrico':
          show = vehicleType.includes('elétrico') || vehicleType.includes('eletrico');
          break;
        case 'micro':
          show = vehicleType.includes('micro');
          break;
        // 'all' mostra todos
      }
      
      vehicle.style.display = show ? 'flex' : 'none';
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
    if (!tipo) return 'padrão';
    
    const tipoLower = tipo.toLowerCase();
    
    if (tipoLower.includes('articulado')) return 'articulado';
    if (tipoLower.includes('superarticulado')) return 'articulado';
    if (tipoLower.includes('elétrico')) return 'elétrico';
    if (tipoLower.includes('eletrico')) return 'elétrico';
    if (tipoLower.includes('micro')) return 'micro';
    if (tipoLower.includes('padrão')) return 'padrão';
    if (tipoLower.includes('padrao')) return 'padrão';
    
    return 'padrão';
  }

  getVehicleColor(tipo) {
    const type = this.getVehicleType(tipo);
    
    switch(type) {
      case 'articulado': return '#FF9800';
      case 'elétrico': return '#00BCD4';
      case 'micro': return '#4CAF50';
      default: return '#2196F3';
    }
  }

  getVehicleTypeClass(tipo) {
    const type = this.getVehicleType(tipo);
    
    switch(type) {
      case 'articulado': return 'articulado';
      case 'elétrico': return 'eletrico';
      case 'micro': return 'micro';
      default: return 'padrao';
    }
  }

  formatVehicleType(tipo) {
    if (!tipo) return 'Padrão';
    
    const tipoLower = tipo.toLowerCase();
    
    if (tipoLower.includes('articulado')) {
      return tipoLower.includes('super') ? 'Super Articulado' : 'Articulado';
    }
    if (tipoLower.includes('elétrico') || tipoLower.includes('eletrico')) {
      return 'Elétrico';
    }
    if (tipoLower.includes('micro')) {
      return 'Microônibus';
    }
    if (tipoLower.includes('padrão') || tipoLower.includes('padrao')) {
      return 'Padrão';
    }
    
    return tipo;
  }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
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
      console.log(`Partidas no schedule: ${scheduleManager.scheduleData ? scheduleManager.scheduleData.length : 0}`);
      
      // Atualizar veículos com os dados do schedule
      if (scheduleManager.scheduleData && scheduleManager.scheduleData.length > 0) {
        vehicleManager.setCurrentScheduleData(scheduleManager.scheduleData);
        vehicleManager.updateVehicleWithSchedule();
        
        console.log("Veículos atualizados com dados do schedule");
      }
      
      // Inicializar YardManager
      yardManager.initialize(vehicleManager, scheduleManager);
      
      console.log("YardManager inicializado com sucesso!");
      
      // Atualizar periodicamente (a cada 30 segundos)
      setInterval(() => {
        if (scheduleManager.scheduleData && scheduleManager.scheduleData.length > 0) {
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