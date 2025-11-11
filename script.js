// === Importar funciones de Firebase desde el contexto global ===
const { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot } = window.firestoreFns;
const db = window.db;

// === Referencias del DOM ===
const form = document.getElementById("formTurno");
const listaTurnos = document.getElementById("listaTurnos");
const borrarTodo = document.getElementById("borrarTodo");
const contenedorServicios = document.getElementById("servicios");

// === Variables de estado ===
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

// === Guardar turno en Firestore ===
async function guardarTurno(turno) {
  await addDoc(collection(db, "turnos"), turno);
}

// === Obtener todos los turnos activos ===
async function obtenerTurnos() {
  const snapshot = await getDocs(collection(db, "turnos"));
  const turnos = [];
  snapshot.forEach(docSnap => turnos.push({ id: docSnap.id, ...docSnap.data() }));
  return turnos;
}

// === Obtener historial ===
async function obtenerHistorial() {
  const snapshot = await getDocs(collection(db, "historialTurnos"));
  const historial = [];
  snapshot.forEach(docSnap => historial.push({ id: docSnap.id, ...docSnap.data() }));
  return historial;
}

// === Eliminar turno ===
async function eliminarTurno(id) {
  await deleteDoc(doc(db, "turnos", id));
}

// === Mover turno a historial ===
async function finalizarTurno(turno) {
  const finalizado = { ...turno, finalizadoEn: new Date().toLocaleString() };
  await addDoc(collection(db, "historialTurnos"), finalizado);
  await eliminarTurno(turno.id);
}

// === Mostrar turnos activos ===
async function mostrarTurnos() {
  const turnos = await obtenerTurnos();
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

    // Eliminar turno
    li.querySelector(".btn-outline-danger").addEventListener("click", async () => {
      if (confirm("¿Eliminar este turno?")) {
        await eliminarTurno(t.id);
        mostrarTurnos();
      }
    });

    // Finalizar turno
    li.querySelector(".btn-outline-success").addEventListener("click", async () => {
      if (confirm("¿Marcar este turno como finalizado?")) {
        await finalizarTurno(t);
        mostrarTurnos();
      }
    });

    listaTurnos.appendChild(li);
  });
}

// === Guardar nuevo turno desde el formulario ===
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const fecha = document.getElementById("fecha").value;
  const hora = document.getElementById("hora").value;

  if (!nombre || !fecha || !hora || !servicioSeleccionado) {
    alert("Por favor completa todos los campos y selecciona un servicio");
    return;
  }

  const turnosActuales = await obtenerTurnos();
  const existeActivo = turnosActuales.some(t => t.fecha === fecha && t.hora === hora);
  if (existeActivo) {
    alert("⚠️ Ya existe un turno registrado para esa fecha y hora.");
    return;
  }

  const turno = {
    nombre,
    fecha,
    hora,
    servicio: servicioSeleccionado,
    creadoEn: new Date().toLocaleString()
  };

  await guardarTurno(turno);
  mostrarTurnos();

  form.reset();
  document.querySelectorAll(".servicio-card").forEach(c => c.classList.remove("active"));
  servicioSeleccionado = null;
});

// === Borrar todos los turnos activos ===
borrarTodo.addEventListener("click", async () => {
  if (confirm("¿Seguro que querés eliminar todos los turnos activos?")) {
    const turnos = await obtenerTurnos();
    for (const t of turnos) {
      await eliminarTurno(t.id);
    }
    mostrarTurnos();
  }
});

// === 🔁 Escucha en tiempo real los turnos finalizados ===
const historialRef = collection(db, "historialTurnos");
const filtroFecha = document.getElementById("filtroFechaHistorial");
const limpiarFiltro = document.getElementById("limpiarFiltro");
const historialTurnos = document.getElementById("historialTurnos");

// Función para renderizar historial
function renderizarHistorial(turnos, fechaFiltro = null) {
  historialTurnos.innerHTML = "";

  let filtrados = turnos;
  if (fechaFiltro) filtrados = turnos.filter(t => t.fecha === fechaFiltro);

  if (filtrados.length === 0) {
    historialTurnos.innerHTML = `
      <li class="list-group-item text-center text-muted">
        No hay turnos finalizados${fechaFiltro ? " en esta fecha" : ""}.
      </li>`;
    return;
  }

  filtrados
    .sort((a, b) => (b.finalizadoEn || "").localeCompare(a.finalizadoEn || ""))
    .forEach(t => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center flex-wrap";
      li.innerHTML = `
        <div>
          <strong>${t.nombre}</strong>
          <div class="text-muted small">${t.fecha} - ${t.hora}</div>
          <span class="badge bg-light text-dark mt-2">${t.servicio}</span>
          <span class="badge bg-success ms-2">Finalizado ✅</span>
        </div>
      `;
      historialTurnos.appendChild(li);
    });
}

// Mantener los turnos cargados en memoria
let historialCache = [];

// Escuchar los cambios en tiempo real
onSnapshot(historialRef, (snapshot) => {
  historialCache = [];
  snapshot.forEach(docSnap => historialCache.push({ id: docSnap.id, ...docSnap.data() }));
  renderizarHistorial(historialCache, filtroFecha.value);
});

// Filtro de fecha
if (filtroFecha) {
  filtroFecha.addEventListener("change", () => {
    renderizarHistorial(historialCache, filtroFecha.value);
  });
}

// Limpiar filtro
if (limpiarFiltro) {
  limpiarFiltro.addEventListener("click", () => {
    filtroFecha.value = "";
    renderizarHistorial(historialCache);
  });
}

// === Inicialización ===
mostrarTurnos();
