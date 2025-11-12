// === Importar funciones de Firebase desde el contexto global ===
const { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot } = window.firestoreFns;
const db = window.db;

// === Referencias del DOM ===
const form = document.getElementById("formTurno");
const listaTurnos = document.getElementById("listaTurnos");
const borrarTodo = document.getElementById("borrarTodo");
const contenedorServicios = document.getElementById("servicios");
const filtroFecha = document.getElementById("filtroFechaHistorial");
const limpiarFiltro = document.getElementById("limpiarFiltro");
const historialTurnos = document.getElementById("historialTurnos");
const inputFecha = document.getElementById("fecha");

// === Variables de estado ===
let servicioSeleccionado = null;
let historialCache = [];
let fechasOcupadas = new Set();

// === Lista de servicios ===
const servicios = [
  { nombre: "Depilación láser", img: "img/images.jpg" },
  { nombre: "Limpieza facial profunda, Dermaplaning", img: "img/limpieza-facial-profunda.jpg" },
  { nombre: "Tratamiento con dermapen", img: "img/Tratamiento con dermapen.jpg" },
  { nombre: "Plasma pen", img: "img/Plasma pen.jpg" },
  { nombre: "Criolipólisis", img: "img/criolipolisis.jpg" },
  { nombre: "Mesoterapia capilar", img: "img/Mesoterapia capilar.jpg" },
  { nombre: "Plasma rico en plaquetas (Rostro, cuello, manos)", img: "img/Plasma rico en plaquetas(Rostro,cuello,escote,manos).jpg" }
];

// === Crear las cards de servicios ===
servicios.forEach(serv => {
  const col = document.createElement("div");
  col.className = "col";

  const card = document.createElement("div");
  card.className = "card servicio-card text-center h-100";

  card.innerHTML = `
    <img src="${serv.img}" alt="${serv.nombre}" class="card-img-top img-fluid" style="object-fit: cover;">
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
function renderizarTurnos(turnos) {
  listaTurnos.innerHTML = "";

  if (turnos.length === 0) {
    listaTurnos.innerHTML =
      '<li class="list-group-item text-center text-muted">No hay turnos activos</li>';
    return;
  }

  fechasOcupadas = new Set(turnos.map(t => t.fecha));
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
      const confirm = await Swal.fire({
        title: "¿Eliminar turno?",
        text: "Esta acción no se puede deshacer.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      });
      if (confirm.isConfirmed) {
        await eliminarTurno(t.id);
        Swal.fire("Eliminado", "El turno fue eliminado.", "success");
      }
    });

    // Finalizar turno
    li.querySelector(".btn-outline-success").addEventListener("click", async () => {
      const confirm = await Swal.fire({
        title: "¿Finalizar turno?",
        text: "Se moverá al historial de turnos.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, finalizar",
        cancelButtonText: "Cancelar",
      });
      if (confirm.isConfirmed) {
        await finalizarTurno(t);
        Swal.fire("Turno finalizado", "El turno se movió al historial.", "success");
      }
    });

    listaTurnos.appendChild(li);
  });

  actualizarFechasCalendario();
}

// === Escuchar turnos en tiempo real ===
const turnosRef = collection(db, "turnos");
onSnapshot(turnosRef, (snapshot) => {
  const turnos = [];
  snapshot.forEach(docSnap => turnos.push({ id: docSnap.id, ...docSnap.data() }));
  renderizarTurnos(turnos);
});

// === Guardar nuevo turno desde el formulario ===
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const fecha = document.getElementById("fecha").value;
  const hora = document.getElementById("hora").value;

  if (!nombre || !fecha || !hora || !servicioSeleccionado) {
    Swal.fire("Campos incompletos", "Por favor completa todos los campos y selecciona un servicio.", "info");
    return;
  }

  const snapshot = await getDocs(turnosRef);
  const existeActivo = snapshot.docs.some(doc => {
    const data = doc.data();
    return data.fecha === fecha && data.hora === hora;
  });
  if (existeActivo) {
    Swal.fire("Turno ocupado", "Ya existe un turno registrado para esa fecha y hora.", "warning");
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
  Swal.fire("Guardado", "El turno fue registrado correctamente.", "success");
  form.reset();
  document.querySelectorAll(".servicio-card").forEach(c => c.classList.remove("active"));
  servicioSeleccionado = null;
});

// === Borrar todos los turnos activos ===
borrarTodo.addEventListener("click", async () => {
  const confirm = await Swal.fire({
    title: "¿Eliminar todos los turnos?",
    text: "Esto eliminará todos los turnos activos.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
  });

  if (confirm.isConfirmed) {
    const snapshot = await getDocs(turnosRef);
    for (const docSnap of snapshot.docs) {
      await eliminarTurno(docSnap.id);
    }
    Swal.fire("Eliminados", "Todos los turnos fueron eliminados.", "success");
  }
});

// === Historial en tiempo real ===
const historialRef = collection(db, "historialTurnos");

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

onSnapshot(historialRef, (snapshot) => {
  historialCache = [];
  snapshot.forEach(docSnap => historialCache.push({ id: docSnap.id, ...docSnap.data() }));
  renderizarHistorial(historialCache, filtroFecha.value);
});

if (filtroFecha) {
  filtroFecha.addEventListener("change", () => {
    renderizarHistorial(historialCache, filtroFecha.value);
  });
}

if (limpiarFiltro) {
  limpiarFiltro.addEventListener("click", () => {
    filtroFecha.value = "";
    renderizarHistorial(historialCache);
  });
}

// === Marcar fechas ocupadas ===
function actualizarFechasCalendario() {
  inputFecha.addEventListener("input", () => {
    const seleccionada = inputFecha.value;
    if (fechasOcupadas.has(seleccionada)) {
      inputFecha.classList.add("is-invalid");
      inputFecha.title = "⚠️ Ya hay un turno este día";
    } else {
      inputFecha.classList.remove("is-invalid");
      inputFecha.title = "";
    }
  });
}
