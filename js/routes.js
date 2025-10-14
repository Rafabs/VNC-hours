class RoutesApp {
  constructor() {
    this.scheduleManager = new ScheduleManager();
    this.routesContainer = document.getElementById("routesContainer");
    this.clockElement = document.getElementById("clock");
    this.dateElement = document.getElementById("date");

    this.init();
  }

  async init() {
    await this.loadSchedule();
    setInterval(() => this.updateClock(), 1000);
  }

  async loadSchedule() {
    const scheduleData = await this.scheduleManager.loadScheduleData();
    this.renderRoutes(scheduleData);
    setInterval(() => this.renderRoutes(scheduleData), 60000);
  }

  updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    this.clockElement.textContent = `${h}:${m}:${s}`;
    const d = String(now.getDate()).padStart(2, "0");
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    this.dateElement.textContent = `${d}/${mo}/${y}`;
  }

  renderRoutes(scheduleData) {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    // Agrupa por linha
    const grouped = {};
    scheduleData.forEach((d) => {
      if (!grouped[d.line]) grouped[d.line] = [];
      grouped[d.line].push(d);
    });

    this.routesContainer.innerHTML = "";

    Object.entries(grouped).forEach(([line, trips]) => {
      const first = trips[0];
      const card = document.createElement("div");
      card.className = "route-card";

      // Cabeçalho
      const header = document.createElement("div");
      header.className = "route-header";
      header.innerHTML = `
        <h3 style="color:${first.bgColor}">
          🚌 ${line} — ${first.destination}
        </h3>
        <span style="color:${first.textColor}; font-size:0.9em;">
          ${trips.length} viagens
        </span>
      `;
      card.appendChild(header);

      // Linha de IDA
      const labelIda = document.createElement("div");
      labelIda.className = "route-direction";
      labelIda.textContent = "➡️ IDA";
      card.appendChild(labelIda);

      const lineIda = document.createElement("div");
      lineIda.className = "route-line";
      lineIda.style.background = `${first.bgColor}66`;
      card.appendChild(lineIda);

      // Linha de VOLTA
      const labelVolta = document.createElement("div");
      labelVolta.className = "route-direction";
      labelVolta.textContent = "⬅️ VOLTA";
      card.appendChild(labelVolta);

      const lineVolta = document.createElement("div");
      lineVolta.className = "route-line";
      lineVolta.style.background = `${first.bgColor}33`;
      card.appendChild(lineVolta);

      // Veículos
      trips.forEach((trip) => {
        const [h, m] = trip.time.split(":").map(Number);
        const start = h * 60 + m;
        const duracao = trip.duracao || 60;
        const end = start + duracao;

        if (currentMins >= start && currentMins <= end) {
          const progress = (currentMins - start) / duracao;
          const ida = progress < 0.5;

          // progresso linear
          const pos = ida
            ? progress * 200
            : (1 - (progress - 0.5) * 2) * 100;

          const marker = document.createElement("div");
          marker.className = "vehicle-marker";
          marker.style.left = `${ida ? progress * 200 : (1 - (progress - 0.5) * 2) * 100}%`;
          marker.style.background = trip.bgColor;

          const directionIcon = ida ? "➡️" : "⬅️";

          // Prefixo + direção
          marker.innerHTML = `
            <div class="vehicle-info">
              <strong>${trip.vehicle}</strong><br>
              ${trip.destination}<br>
              ${Math.floor(progress * 100)}% do trajeto<br>
              Plat. ${trip.platform}
            </div>
            <div class="vehicle-label">${directionIcon} ${trip.vehicle}</div>
          `;

          (ida ? lineIda : lineVolta).appendChild(marker);
        }
      });

      this.routesContainer.appendChild(card);
    });
  }
}

window.addEventListener("DOMContentLoaded", () => new RoutesApp());
