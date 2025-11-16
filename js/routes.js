class RoutesApp {
  constructor() {
    this.scheduleManager = new ScheduleManager();
    this.routesContainer = document.getElementById("routesContainer");
    this.waitingList = document.querySelector(".waiting-list");
    this.reserveList = document.querySelector(".reserve-list");
    this.clockElement = document.getElementById("clock");
    this.dateElement = document.getElementById("date");
    this.lucide = window.lucide || null;
    this.init();
  }

  async init() {
    // Carrega dados de horários
    const scheduleData = await this.scheduleManager.loadScheduleData();

    // 🔹 Carrega dados da frota
    const fleetData = await fetch("./data/vehicles.json").then((r) => r.json());
    this.fleetMap = {};
    fleetData.forEach((v) => {
      this.fleetMap[v.PREFIXO.toUpperCase()] = {
        modelo: v.MODELO,
        tipo: v.TIPO,
        status: v.STATUS_OP,
        garagem: v.GARAGEM, // ← Agora carrega a informação da garagem
        bgColor: this.pickColorForLine(v.PREFIXO),
      };
    });

    // 🔹 Enriquecimento dos dados de viagem
    scheduleData.forEach((d, i) => {
      d.bgColor = d.bgColor || this.pickColorForLine(d.line, i);
      d.textColor = d.textColor || "#fff";
      d.duracao = d.duracao || 60;

      const prefixo = (d.vehicle || "").toUpperCase().trim();
      if (this.fleetMap[prefixo]) {
        d.model = this.fleetMap[prefixo].modelo;
        d.type = this.fleetMap[prefixo].tipo;
        d.garagem = this.fleetMap[prefixo].garagem; // ← Também adiciona garagem aos escalados
      }
    });

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
    document.body.dataset.theme =
      now.getHours() >= 6 && now.getHours() < 18 ? "day" : "night";
  }

  pickColorForLine(line, idx = 0) {
    // Paleta agradável para diferenciar linhas
    const palette = [
      "#FF6F00",
      "#FFC107",
      "#D32F2F",
      "#FF7043",
      "#40E0D0",
      "#2196F3",
      "#9C27B0",
      "#4CAF50",
    ];
    // stable-ish pick based on hash
    let hash = 0;
    for (let i = 0; i < line.length; i++)
      hash = (hash << 5) - hash + line.charCodeAt(i);
    const pick = Math.abs(hash) % palette.length;
    return palette[pick];
  }

  // Decide tipo de veículo pelo texto (tenta cobrir vários padrões)
  detectVehicleType(vehicleStr = "") {
    const s = vehicleStr.toLowerCase();
    if (/ele(tric|tro)|e-|spark|ev|elétrico/.test(s))
      return { type: "electric", icon: "zap" };
    if (/articulad|artic|biart|art/.test(s))
      return { type: "articulado", icon: "truck" };
    if (/micro|microônibus|micro-bus|midibus|van/.test(s))
      return { type: "micro", icon: "shopping-bag" };
    if (/metro|metrô|tren|trem|tram/.test(s))
      return { type: "tram", icon: "train" };
    if (/res|r\/|reserve|standby|stand/.test(s))
      return { type: "reserve", icon: "clock" };
    return { type: "bus", icon: "bus" };
  }

  // Atualização contínua (render em loop)
  startRealtimeUpdate(data) {
    const update = () => {
      this.renderWaiting(data);
      this.renderReserve(data);
      this.routesContainer.innerHTML = "";
      this.renderRoutes(data);

      if (this.lucide && typeof this.lucide.replace === "function") {
        try {
          this.lucide.replace();
        } catch (e) {}
      }
    };

    // Atualiza uma vez por segundo (estável e suficiente)
    update();
    setInterval(update, 1000);
  }

  renderWaiting(data) {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    // Consideramos os próximos 10 veículos que partem (ordenados por tempo)
    const waiting = data
      .map((d) => ({ ...d }))
      .filter((d) => {
        const [h, m] = d.time.split(":").map(Number);
        const dep = h * 60 + m;
        // partem no futuro (ou no mesmo minuto)
        return dep >= nowMins;
      })
      .sort((a, b) => {
        const ta = a.time.split(":").map(Number);
        const tb = b.time.split(":").map(Number);
        return ta[0] * 60 + ta[1] - (tb[0] * 60 + tb[1]);
      })
      .slice(0, 20);

    if (!this.waitingList) return;

    if (waiting.length === 0) {
      this.waitingList.innerHTML = "<em>Nenhum veículo aguardando</em>";
      return;
    }

    this.waitingList.innerHTML = waiting
      .map((d) => {
        const mins = this.scheduleManager.minutesUntilDeparture(d.time);
        // progress relativo em janela de 30 minutos -> 0..100
        const windowMin = 30;
        const pct = Math.max(
          4,
          Math.min(
            100,
            Math.round((1 - Math.min(windowMin, mins) / windowMin) * 100)
          )
        );
        const vt = this.detectVehicleType(d.vehicle, d.model, d.type);
        const label = `${d.line} • ${d.vehicle}`;
        const destino = d.destination || "";
        return `
        <div class="waiting-item" title="${destino}">
          <div class="vehicle-meta">
            <i data-lucide="${vt.icon}" class="vehicle-icon" style="--bus-color:${d.bgColor}"></i>
            <div style="display:flex;flex-direction:column;">
              <strong style="font-size:0.95em">${label}</strong>
              <small style="opacity:.8">${destino}</small>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="font-size:11px; color:var(--accent-yellow); display:flex; justify-content:flex-end;">
              <span>${mins} min</span>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;align-items:flex-end;">
            <div style="font-size:11px; color:rgba(255,255,255,0.45)">${d.time}</div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  renderReserve(data) {
    if (!this.reserveList) return;
    const now = new Date();

    // 🔹 Obter todos os veículos escalados para hoje
    const scheduledVehicles = new Set();
    data.forEach((d) => {
      if (d.vehicle && d.vehicle.trim()) {
        scheduledVehicles.add(d.vehicle.toUpperCase().trim());
      }
    });

    // 🔹 Filtrar veículos da frota que NÃO estão escalados e são da VILA NOVA CACHOEIRINHA
    const reserveVehicles = [];
    const processedPrefixos = new Set(); // Para evitar duplicatas

    Object.keys(this.fleetMap).forEach((prefixo) => {
      const vehicleInfo = this.fleetMap[prefixo];

      // Pular se já processamos este prefixo
      if (processedPrefixos.has(prefixo)) return;

      // Verifica se o veículo é da VILA NOVA CACHOEIRINHA e está EM OPERAÇÃO
      if (
        vehicleInfo.garagem === "VILA NOVA CACHOEIRINHA" &&
        vehicleInfo.status === "EM OPERAÇÃO" &&
        !scheduledVehicles.has(prefixo)
      ) {
        reserveVehicles.push({
          vehicle: prefixo,
          model: vehicleInfo.modelo,
          type: vehicleInfo.tipo,
          garagem: vehicleInfo.garagem,
          status: "DISPONÍVEL",
          bgColor: vehicleInfo.bgColor || this.getVehicleColor(prefixo),
        });

        processedPrefixos.add(prefixo); // Marcar como processado
      }
    });

    // 🔹 Também incluir veículos marcados como reserva no schedule (apenas da VNC e EM OPERAÇÃO)
    const explicitReserve = data.filter((d) => {
      const prefixo = (d.vehicle || "").toUpperCase().trim();
      const vehicleInfo = this.fleetMap[prefixo];

      return (
        vehicleInfo &&
        vehicleInfo.garagem === "VILA NOVA CACHOEIRINHA" &&
        vehicleInfo.status === "EM OPERAÇÃO" &&
        (/(^R$)|\bRES\b|\bRESERVA\b|\bSTANDBY\b|reserve/i.test(d.vehicle) ||
          !scheduledVehicles.has(prefixo))
      );
    });

    // Combinar e remover duplicatas
    const allReserveMap = new Map();

    // Primeiro adicionar os veículos de reserva explícitos
    explicitReserve.forEach((vehicle) => {
      const key = vehicle.vehicle.toUpperCase().trim();
      if (!allReserveMap.has(key)) {
        allReserveMap.set(key, vehicle);
      }
    });

    // Depois adicionar os veículos não escalados (se não existirem ainda)
    reserveVehicles.forEach((vehicle) => {
      const key = vehicle.vehicle.toUpperCase().trim();
      if (!allReserveMap.has(key)) {
        allReserveMap.set(key, vehicle);
      }
    });

    const allReserve = Array.from(allReserveMap.values()).slice(0, 63);

    // Ordenar por prefixo para melhor visualização
    allReserve.sort((a, b) => {
      return a.vehicle.localeCompare(b.vehicle);
    });

    if (allReserve.length === 0) {
      this.reserveList.innerHTML = "<em>Nenhum veículo reserva</em>";
      return;
    }

    this.reserveList.innerHTML = allReserve
      .map((d) => {
        const mins = d.time
          ? this.scheduleManager.minutesUntilDeparture(d.time)
          : -1;
        const vt = this.detectVehicleType(d.vehicle);
        const label = `${d.vehicle} ${d.line ? "• " + d.line : ""}`;
        const statusText =
          d.status || (mins >= 0 ? `Parte em ${mins} min` : "Disponível");

        return `
      <div class="reserve-item">
        <div style="display:flex;gap:8px;align-items:center;">
          <i data-lucide="${vt.icon}" class="vehicle-icon" style="--bus-color:${
          d.bgColor || "#666"
        }"></i>
          <div style="display:flex;flex-direction:column;">
            <strong style="font-size:0.95em">${label}</strong>
            <small style="opacity:.8">${
              d.destination || d.model || "Veículo reserva"
            }</small>
          </div>
        </div>

        <div style="text-align:right;">
          <div class="status">${statusText}</div>
          <div style="font-size:11px; color:rgba(255,255,255,0.45)">${
            d.time || "V.N. CACHOEIRINHA"
          }</div>
        </div>
      </div>
    `;
      })
      .join("");
  }

  // Adicione este método na classe RoutesApp
  getVehicleColor(vehicle, index = 0) {
    if (!vehicle) return "#666";

    // Para veículos já com bgColor
    if (this.fleetMap[vehicle] && this.fleetMap[vehicle].bgColor) {
      return this.fleetMap[vehicle].bgColor;
    }

    // Gerar cor consistente baseada no prefixo do veículo
    const palette = [
      "#666666",
      "#888888",
      "#555555",
      "#777777",
      "#999999",
      "#6B7280",
      "#4B5563",
      "#374151",
      "#6D7280",
      "#4B5563",
    ];

    let hash = 0;
    for (let i = 0; i < vehicle.length; i++) {
      hash = (hash << 5) - hash + vehicle.charCodeAt(i);
    }
    const pick = Math.abs(hash) % palette.length;
    return palette[pick];
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
      // sort by time
      trips.sort((a, b) => {
        const ta = a.time.split(":").map(Number);
        const tb = b.time.split(":").map(Number);
        return ta[0] * 60 + ta[1] - (tb[0] * 60 + tb[1]);
      });

      const first = trips[0];
      const card = document.createElement("div");
      card.className = "route-card";

      card.innerHTML = `
        <div class="route-header">
          <div style="display:flex;gap:12px;align-items:center;">
            <div style="width:12px;height:12px;border-radius:3px;background:${
              first.bgColor
            };box-shadow:0 4px 10px ${first.bgColor}22;"></div>
            <h3 style="color:var(--); margin:0;">${line} — <span style="opacity:.9; font-weight:600">${
        first.destination || "—"
      }</span></h3>
          </div>
          <span style="font-size:0.95em;opacity:.9">${
            trips.length
          } viagens</span>
        </div>

        <div class="route-direction">➡️ IDA</div>
        <div class="route-line route-line-ida" style="background: linear-gradient(90deg, ${
          first.bgColor
        }33, ${first.bgColor}11)"></div>
        <div class="route-direction">⬅️ VOLTA</div>
        <div class="route-line route-line-volta" style="background: linear-gradient(90deg, ${
          first.bgColor
        }22, ${first.bgColor}08)"></div>
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
          // position percentage (0..100)
          const pos = Math.min(Math.max(progress * 100, 0), 100);

          const marker = document.createElement("div");
          marker.className = "vehicle-marker";
          marker.style.left = `${pos}%`;

          const vt = this.detectVehicleType(trip.vehicle);
          const remainingMin = Math.max(0, Math.ceil((1 - progress) * duracao));
          const percInt = Math.max(
            0,
            Math.min(100, Math.round(progress * 100))
          );

          marker.innerHTML = `
            <div class="pulse" style="background:${trip.bgColor}55"></div>

            <div class="vehicle-tooltip">
              <strong>${trip.vehicle}</strong><br>
              ${trip.model || trip.type || ""}<br>
              ${trip.destination || ""}<br>
              ${percInt}% do trajeto — Faltam ${remainingMin} min
            </div>

            <div class="vehicle-icon"
                style="background:linear-gradient(180deg, ${trip.bgColor}, ${
            trip.bgColor
          }CC);
                        border-radius:8px;">
              <i data-lucide="${vt.icon}"></i>
            </div>

            <div class="vehicle-label">${trip.vehicle}</div>

            ${this.renderBusImage(trip.type, trip.model, ida)}
          `;

          // hover highlight: light up line background
          marker.addEventListener("mouseenter", () => {
            (ida
              ? lineIda
              : lineVolta
            ).style.boxShadow = `0 6px 28px ${trip.bgColor}33 inset`;
          });
          marker.addEventListener("mouseleave", () => {
            (ida ? lineIda : lineVolta).style.boxShadow = "";
          });

          (ida ? lineIda : lineVolta).appendChild(marker);
        }
      });

      this.routesContainer.appendChild(card);
    });
  }
  renderBusImage(type, model, ida) {
    const dir = ida ? "IDA" : "VOLTA";
    const t = (type || "").toUpperCase();
    const m = (model || "").toUpperCase();

    let fileBase;

    // Ordem de prioridade: modelo > tipo
    if (/SUPERARTICULADO|23M/.test(m + t)) fileBase = "BRTII-SUPERARTICULADO";
    else if (/ARTICULADO/.test(m + t)) fileBase = "M5-ARTICULADO";
    else if (/MILLENNIUM\s*4/.test(m)) fileBase = "M4-PADRON";
    else if (/MILLENNIUM\s*5/.test(m)) fileBase = "M5-PADRON";
    else if (/PADRON/.test(m + t)) fileBase = "M5-PADRON";
    else fileBase = "M5-PADRON"; // fallback

    const src = `img/vehicles/${fileBase}-${dir}.jpg`;
    return `
    <img src="${src}" 
         alt="${model || type}" 
         class="bus-img ${ida ? "forward" : "backward"}" 
         loading="lazy" 
         title="${model || type}" />
  `;
  }
}

window.addEventListener("DOMContentLoaded", () => new RoutesApp());
