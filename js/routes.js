class RoutesApp {
  constructor() {
    this.scheduleManager = new ScheduleManager();
    this.routesContainer = document.getElementById("routesContainer");
    this.waitingList = document.querySelector(".waiting-list");
    this.reserveList = document.querySelector(".reserve-list");
    this.clockElement = document.getElementById("clock");
    this.dateElement = document.getElementById("date");
    this.init();
  }

  async init() {
    const scheduleData = await this.scheduleManager.loadScheduleData();
    this.renderWaiting(scheduleData);
    this.renderReserve(scheduleData);
    this.startRealtimeUpdate(scheduleData);

    // Atualiza relógio + tema
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  }

  updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    if (this.clockElement) this.clockElement.textContent = `${h}:${m}:${s}`;

    const d = String(now.getDate()).padStart(2, "0");
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    if (this.dateElement) this.dateElement.textContent = `${d}/${mo}/${y}`;

    // tema dia/noite automático
    document.body.dataset.theme = h >= 6 && h < 18 ? "day" : "night";
  }

  // Atualização contínua
  startRealtimeUpdate(data) {
    const update = () => {
      this.routesContainer.innerHTML = "";
      this.renderRoutes(data);
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  renderWaiting(data) {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const waiting = data
      .filter((d) => {
        const [h, m] = d.time.split(":").map(Number);
        const dep = h * 60 + m;
        return dep > nowMins;
      })
      .slice(0, 10);

    this.waitingList.innerHTML = waiting.length
      ? waiting
          .map(
            (d) => `
        <div class="waiting-item">
          <span>${d.line} • ${d.vehicle}</span>
          <span class="time">Parte em ${this.scheduleManager.minutesUntilDeparture(
            d.time
          )} min</span>
        </div>`
          )
          .join("")
      : "<em>Nenhum veículo aguardando</em>";
  }

  renderReserve(data) {
    const reserve = data.filter((d) => /R|RES|STANDBY/i.test(d.vehicle));
    this.reserveList.innerHTML = reserve.length
      ? reserve
          .map(
            (d) => `
        <div class="reserve-item">
          <span>${d.vehicle}</span>
          <span class="status">Em espera</span>
        </div>`
          )
          .join("")
      : "<em>Nenhum veículo reserva</em>";
  }

  renderRoutes(data) {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const nowSecs = now.getSeconds();
    const grouped = {};

    data.forEach((d) => {
      if (!grouped[d.line]) grouped[d.line] = [];
      grouped[d.line].push(d);
    });

    Object.entries(grouped).forEach(([line, trips]) => {
      const first = trips[0];
      const card = document.createElement("div");
      card.className = "route-card";

      card.innerHTML = `
        <div class="route-header">
          <h3 style="color:${first.bgColor}">🚌 ${line} — ${first.destination}</h3>
          <span style="color:${first.textColor}; font-size:0.9em;">
            ${trips.length} viagens
          </span>
        </div>
        <div class="route-direction">➡️ IDA</div>
        <div class="route-line route-line-ida" style="background:${first.bgColor}55"></div>
        <div class="route-direction">⬅️ VOLTA</div>
        <div class="route-line route-line-volta" style="background:${first.bgColor}33"></div>
      `;

      const lineIda = card.querySelector(".route-line-ida");
      const lineVolta = card.querySelector(".route-line-volta");

      trips.forEach((trip) => {
        const [h, m] = trip.time.split(":").map(Number);
        const start = h * 60 + m;
        const duracao = trip.duracao || 60;
        const end = start + duracao;

        const nowTotal = nowMins + nowSecs / 60;
        if (nowTotal >= start && nowTotal <= end) {
          const progress = (nowTotal - start) / duracao;
          const ida = progress < 0.5;
          const pos = Math.min(
            Math.max(ida ? progress * 200 : (1 - (progress - 0.5) * 2) * 100, 0),
            100
          );

          const marker = document.createElement("div");
          marker.className = "vehicle-marker";
          marker.style.left = `${pos}%`;

          marker.innerHTML = `
            <div class="vehicle-tooltip">
              <strong>${trip.vehicle}</strong><br>
              ${trip.destination}<br>
              ${Math.floor(progress * 100)}% do trajeto<br>
              Faltam ${Math.ceil((1 - progress) * trip.duracao)} min
            </div>
            <div class="vehicle-label">${trip.vehicle}</div>
            <svg class="bus-svg ${ida ? "forward" : "backward"}" viewBox="0 0 50 25">
              <rect x="1" y="6" width="48" height="14" rx="3" fill="${trip.bgColor}" stroke="white" stroke-width="1.5"/>
              <circle cx="8" cy="20" r="3" fill="black"/>
              <circle cx="42" cy="20" r="3" fill="black"/>
              <circle cx="5" cy="7" r="2" fill="yellow" opacity="0.8"/>
              <circle cx="45" cy="7" r="2" fill="yellow" opacity="0.8"/>
            </svg>
          `;

          (ida ? lineIda : lineVolta).appendChild(marker);
        }
      });

      this.routesContainer.appendChild(card);
    });
  }
}

window.addEventListener("DOMContentLoaded", () => new RoutesApp());
