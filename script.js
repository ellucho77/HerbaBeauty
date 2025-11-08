const form = document.getElementById("formTurno");
const listaTurnos = document.getElementById("listaTurnos");
const historialTurnos = document.getElementById("historialTurnos");
const borrarTodo = document.getElementById("borrarTodo");
const contenedorServicios = document.getElementById("servicios");

// Cargar desde localStorage
let turnos = JSON.parse(localStorage.getItem("turnos")) || [];
let historial = JSON.parse(localStorage.getItem("historial")) || [];
let servicioSeleccionado = null;

// === Lista de servicios ===
const servicios = [
  { nombre: "Depilación láser", img: "img/images.jpg" },
  { nombre: "Limpieza facial profunda, Dermaplaning", img: "img/limpieza-facial-profunda.jpg" },
  { nombre: "Tratamiento con dermapen", img: "img/Tratamiento con dermapen.jpg" },
  { nombre: "Plasma pen", img: "img/Plasma pen.jpg" },
  { nombre: "Criolipólisis", img: "img/criolipolisis.jpg" },
  { nombre: "Mesoterapia capilar", img: "img/Mesoterapia capilar.jpg" },
  { nombre: "Plasma rico en plaquetas (Rostro, cuello, escote, manos)", img: "img/Plasma rico en plaquetas(Rostro,cuello,escote,manos).jpg" }
];

// === Crear las cards de servicios ===
servicios.forEach(serv => {
  const col = document.createElement("div");
  col.className = "col";

  const card = document.createElement("div");
  card.className = "card servicio-card text-center h-100";

  card.innerHTML = `
    <img src="${serv.img}" alt="${serv.nombre}" class="card-img-top">
    <div class="card-body d-flex align-items-center justify-content-center">
      <h6 class="card-title">${serv.nombre}</h6>
    </div>
  `;

  card.addEventListener("click", () => {
    document.querySelectorAll(".servicio-card").forEach(c => c.classList.remove("active"));
    card.classList.add("active");
    servicioSeleccionado = serv.nombre;
  });

  col.appendChild(card);
  contenedorServicios.appendChild(col);
});

// Mostrar los turnos activos e historial
mostrarTurnos();
mostrarHistorial();

// === Guardar nuevo turno ===
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const fecha = document.getElementById("fecha").value;
  const hora = document.getElementById("hora").value;

  if (!nombre || !fecha || !hora || !servicioSeleccionado) {
    alert("Por favor completa todos los campos y selecciona un servicio");
    return;
  }

  // Verificar duplicado solo entre los turnos activos
  const existeActivo = turnos.some((t) => t.fecha === fecha && t.hora === hora);
  if (existeActivo) {
    alert("⚠️ Ya existe un turno registrado para esa fecha y hora.");
    return;
  }

  const turno = {
    id: Date.now(),
    nombre,
    fecha,
    hora,
    servicio: servicioSeleccionado
  };

  turnos.push(turno);
  guardarDatos();
  mostrarTurnos();

  form.reset();
  document.querySelectorAll(".servicio-card").forEach(c => c.classList.remove("active"));
  servicioSeleccionado = null;
});

// === Mostrar turnos activos ===
function mostrarTurnos() {
  listaTurnos.innerHTML = "";

  if (turnos.length === 0) {
    listaTurnos.innerHTML =
      '<li class="list-group-item text-center text-muted">No hay turnos activos</li>';
    return;
  }

  turnos.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

  turnos.forEach((t) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center flex-wrap";

    li.innerHTML = `
      <div>
        <strong>${t.nombre}</strong>
        <div class="text-muted small">${t.fecha} - ${t.hora}</div>
        <span class="badge bg-info text-dark mt-2">${t.servicio}</span>
      </div>
      <div class="btn-group mt-2 mt-md-0" role="group">
        <button class="btn btn-sm btn-outline-success">Finalizar</button>
        <button class="btn btn-sm btn-outline-danger">🗑️</button>
      </div>
    `;

    // Eliminar turno activo
    li.querySelector(".btn-outline-danger").addEventListener("click", () => {
      if (confirm("¿Eliminar este turno?")) {
        turnos = turnos.filter((turno) => turno.id !== t.id);
        guardarDatos();
        mostrarTurnos();
      }
    });

    // Finalizar turno (mueve al historial)
    li.querySelector(".btn-outline-success").addEventListener("click", () => {
      if (confirm("¿Marcar este turno como finalizado?")) {
        const finalizado = { ...t, finalizadoEn: new Date().toLocaleString() };
        historial.push(finalizado);
        turnos = turnos.filter((turno) => turno.id !== t.id);
        guardarDatos();
        mostrarTurnos();
        mostrarHistorial();
      }
    });

    listaTurnos.appendChild(li);
  });
}

// === Mostrar historial ===
function mostrarHistorial() {
  historialTurnos.innerHTML = "";

  if (historial.length === 0) {
    historialTurnos.innerHTML =
      '<li class="list-group-item text-center text-muted">Aún no hay turnos finalizados</li>';
    return;
  }

  historial
    .sort((a, b) => (b.finalizadoEn || "").localeCompare(a.finalizadoEn || ""))
    .forEach((t) => {
      const li = document.createElement("li");
      li.className =
        "list-group-item finalizado d-flex justify-content-between align-items-center flex-wrap";

      li.innerHTML = `
        <div>
          <strong class="text-muted">${t.nombre}</strong>
          <div class="text-muted small">${t.fecha} - ${t.hora}</div>
          <span class="badge bg-light text-dark mt-2">${t.servicio}</span>
          <span class="badge bg-success ms-2">Finalizado ✅</span>
        </div>
      `;

      historialTurnos.appendChild(li);
    });
}

// === Guardar en localStorage ===
function guardarDatos() {
  localStorage.setItem("turnos", JSON.stringify(turnos));
  localStorage.setItem("historial", JSON.stringify(historial));
}

// === Borrar todos los turnos activos ===
borrarTodo.addEventListener("click", () => {
  if (confirm("¿Seguro que querés eliminar todos los turnos activos?")) {
    turnos = [];
    guardarDatos();
    mostrarTurnos();
  }
});
