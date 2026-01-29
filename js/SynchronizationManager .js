class SynchronizationManager {
  constructor(vehicleManager, scheduleManager, yardManager) {
    this.vehicleManager = vehicleManager;
    this.scheduleManager = scheduleManager;
    this.yardManager = yardManager;
    this.isSyncing = false;
    this.syncInterval = null;
    
    // Estatísticas
    this.lastSyncTime = null;
    this.syncCount = 0;
  }

  async initialize() {
    console.log('🔄 Inicializando SynchronizationManager...');
    
    // 1. Escutar eventos de atualização
    this.setupEventListeners();
    
    // 2. Iniciar sincronização periódica
    this.startPeriodicSync();
    
    // 3. Forçar primeira sincronização
    setTimeout(() => this.forceSync(), 1000);
  }

  setupEventListeners() {
    // Escutar atualizações do schedule
    document.addEventListener('scheduleUpdated', (event) => {
      console.log('📅 Evento scheduleUpdated recebido');
      this.syncYardDisplay();
    });

    // Escutar atualizações de veículos
    document.addEventListener('vehiclesUpdated', (event) => {
      console.log('🚌 Evento vehiclesUpdated recebido');
      this.syncYardDisplay();
    });

    // Escutar término de viagem
    document.addEventListener('vehicleTripFinished', (event) => {
      console.log('🎯 Evento vehicleTripFinished recebido');
      this.syncYardDisplay();
    });

    // Escutar mudanças de status em tempo real
    document.addEventListener('vehicleStatusChanged', (event) => {
      console.log('🔄 Evento vehicleStatusChanged recebido');
      this.syncYardDisplay();
    });
  }

  startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Sincronizar a cada 3 segundos (backup caso eventos falhem)
    this.syncInterval = setInterval(() => {
      this.syncYardDisplay();
    }, 3000);
  }

  async syncYardDisplay() {
    if (this.isSyncing) {
      console.log('🔄 Sincronização já em andamento, pulando...');
      return;
    }

    this.isSyncing = true;
    this.syncCount++;
    
    try {
      console.log(`🔄 Sincronização #${this.syncCount} iniciada...`);
      this.lastSyncTime = new Date();
      
      // 1. Atualizar veículos com os dados mais recentes do schedule
      if (this.scheduleManager.scheduleData && 
          this.scheduleManager.scheduleData.length > 0) {
        this.vehicleManager.setCurrentScheduleData(this.scheduleManager.scheduleData);
        this.vehicleManager.updateVehicleWithSchedule();
      }
      
      // 2. Atualizar display do pátio
      if (this.yardManager.updateYardDisplays) {
        await this.yardManager.updateYardDisplays();
      }
      
      // 3. Log de sucesso
      console.log(`✅ Sincronização #${this.syncCount} concluída`, {
        time: this.lastSyncTime.toLocaleTimeString(),
        vehicles: this.vehicleManager.vehicles.size,
        scheduleEntries: this.scheduleManager.scheduleData ? this.scheduleManager.scheduleData.length : 0
      });
      
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async forceSync() {
    console.log('⚡ Forçando sincronização completa...');
    await this.syncYardDisplay();
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.vehicleManager.stopAutoUpdate) {
      this.vehicleManager.stopAutoUpdate();
    }
    
    if (this.scheduleManager.stopAutoUpdate) {
      this.scheduleManager.stopAutoUpdate();
    }
    
    console.log('🛑 Sincronização parada');
  }

  getStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      syncCount: this.syncCount,
      vehicleCount: this.vehicleManager.vehicles.size,
      scheduleCount: this.scheduleManager.scheduleData ? this.scheduleManager.scheduleData.length : 0
    };
  }
}