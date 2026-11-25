// =====================================
// 1. CONEXIÓN CON SUPABASE
// =====================================

const SUPABASE_URL = "https://uqcqgrpvciojtgxkadfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_y7XIQK0zlyrxXk7q2WgVyQ_v8_5E7Qw";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// =====================================
// 2. ELEMENTOS DE LA INTERFAZ
// =====================================

const habitList = document.getElementById("habitList");
const habitForm = document.getElementById("habitForm");
const habitModal = document.getElementById("habitModal");
const openForm = document.getElementById("openForm");
const closeForm = document.getElementById("closeForm");
const statusMessage = document.getElementById("statusMessage");

const progressCount = document.getElementById("progressCount");
const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");
const progressMessage = document.getElementById("progressMessage");

let habits = [];
let completedHabits = new Set();
let selectedFilter = "Todos";

// =====================================
// 3. FECHA ACTUAL
// =====================================

function getToday() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function showDate() {
    const date = new Date();

    document.getElementById("todayLabel").textContent =
        date.toLocaleDateString("es-MX", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });

    document.getElementById("progressDate").textContent =
        date.toLocaleDateString("es-MX", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
}

// =====================================
// 4. MENSAJES
// =====================================

function notify(message) {
    statusMessage.textContent = message;
    statusMessage.style.display = "block";

    clearTimeout(notify.timer);

    notify.timer = setTimeout(() => {
        statusMessage.style.display = "none";
    }, 3500);
}

// =====================================
// 5. ABRIR Y CERRAR FORMULARIO
// =====================================

openForm.addEventListener("click", () => {
    habitModal.classList.remove("hidden");
    document.getElementById("habitName").focus();
});

closeForm.addEventListener("click", () => {
    closeModal();
});

habitModal.addEventListener("click", (event) => {
    if (event.target === habitModal) {
        closeModal();
    }
});

function closeModal() {
    habitModal.classList.add("hidden");
    habitForm.reset();
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeModal();
    }
});

// =====================================
// 6. CONSULTAR HABITOS
// =====================================

async function loadHabits() {
    habitList.innerHTML =
        '<p class="empty-state">Cargando tus hábitos...</p>';

    const today = getToday();

    const { data: habitData, error: habitError } = await db
        .from("habits")
        .select("*")
        .order("created_at", { ascending: false });

    if (habitError) {
        notify("Error al consultar hábitos: " + habitError.message);
        habitList.innerHTML =
            '<p class="empty-state">No se pudieron cargar los hábitos.</p>';
        hideWelcome();
        return;
    }

    const { data: logData, error: logError } = await db
        .from("habit_logs")
        .select("habit_id")
        .eq("completed_on", today);

    if (logError) {
        notify("Error al consultar progreso: " + logError.message);
        habitList.innerHTML =
            '<p class="empty-state">No se pudo cargar el progreso.</p>';
        hideWelcome();
        return;
    }

    habits = habitData || [];

    completedHabits = new Set(
        (logData || []).map(log => String(log.habit_id))
    );

    renderHabits();
    updateProgress();

    hideWelcome();
}

/* =================================
   BLOOM - BIENVENIDA INTERACTIVA
================================= */

const welcomeStartedAt = Date.now();

function initializeWelcomeScreen() {
    const tileContainer = document.getElementById("welcomeTiles");

    if (!tileContainer) return;

    // Crear los 25 cuadritos
    for (let i = 0; i < 25; i++) {
        const tile = document.createElement("div");
        tile.className = "welcome-tile";
        tileContainer.appendChild(tile);
    }

    const tiles = tileContainer.querySelectorAll(".welcome-tile");

    // Reacción al movimiento del mouse
    tileContainer.addEventListener("pointermove", (event) => {
        const rect = tileContainer.getBoundingClientRect();

        const mouseX = event.clientX;
        const mouseY = event.clientY;

        tiles.forEach(tile => {
            const tileRect = tile.getBoundingClientRect();

            const centerX = tileRect.left + tileRect.width / 2;
            const centerY = tileRect.top + tileRect.height / 2;

            const dx = mouseX - centerX;
            const dy = mouseY - centerY;

            const distance = Math.sqrt(dx * dx + dy * dy);
            const influence = Math.max(0, 1 - distance / 180);

            const rotateX = (dy / 180) * 22 * influence;
            const rotateY = -(dx / 180) * 22 * influence;

            tile.style.transform =
                `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${1 + influence * 0.08})`;
        });
    });

    // Regresar los cuadritos a su posición
    tileContainer.addEventListener("pointerleave", () => {
        tiles.forEach(tile => {
            tile.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
        });
    });
}

// Ocultar bienvenida después de un mínimo de 2.8 segundos
function hideWelcome() {
    const welcomeScreen = document.getElementById("welcomeScreen");

    if (!welcomeScreen) return;

    const elapsed = Date.now() - welcomeStartedAt;
    const remaining = Math.max(0, 2800 - elapsed);

    setTimeout(() => {
        welcomeScreen.classList.add("hide");
    }, remaining);
}

// Inicializar la pantalla
initializeWelcomeScreen();

// =====================================
// 7. MOSTRAR HABITOS
// =====================================

function renderHabits() {
    habitList.innerHTML = "";

    const filteredHabits = habits.filter(habit => {
        return selectedFilter === "Todos" ||
            habit.category === selectedFilter;
    });

    if (filteredHabits.length === 0) {
        habitList.innerHTML = `
            <p class="empty-state">
                Todavía no hay hábitos aquí. ♡
                ¡Agrega uno para comenzar!
            </p>
        `;
        return;
    }

    filteredHabits.forEach(habit => {
        const isCompleted =
            completedHabits.has(String(habit.id));

        const card = document.createElement("article");

        card.className = isCompleted
            ? "habit-card completed"
            : "habit-card";

        const info = document.createElement("div");
        info.className = "habit-info";

        const title = document.createElement("h3");
        title.textContent = habit.name;

        const category = document.createElement("span");
        category.className = "habit-category";
        category.textContent = habit.category;

        info.append(title, category);

        const actions = document.createElement("div");
        actions.className = "habit-actions";

        const checkButton = document.createElement("button");
        checkButton.className = "check-button";
        checkButton.textContent = isCompleted ? "✓" : "";
        checkButton.setAttribute(
            "aria-label",
            isCompleted ? "Desmarcar hábito" : "Completar hábito"
        );

        checkButton.addEventListener("click", () => {
            toggleHabit(habit.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.textContent = "×";
        deleteButton.setAttribute("aria-label", "Eliminar hábito");

        deleteButton.addEventListener("click", () => {
            deleteHabit(habit.id);
        });

        actions.append(checkButton, deleteButton);
        card.append(info, actions);

        habitList.appendChild(card);
    });
}

// =====================================
// 8. REGISTRAR UN NUEVO HABITO
// =====================================

habitForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("habitName")
        .value.trim();

    const category = document.getElementById("habitCategory")
        .value;

    if (!name || !category) {
        notify("Completa todos los campos.");
        return;
    }

    const saveButton = document.getElementById("saveButton");

    saveButton.disabled = true;
    saveButton.textContent = "Guardando...";

    const { error } = await db
        .from("habits")
        .insert([{ name, category }]);

    saveButton.disabled = false;
    saveButton.textContent = "Guardar hábito ♡";

    if (error) {
        notify("No se pudo guardar: " + error.message);
        return;
    }

    closeModal();
    notify("¡Tu nuevo hábito ha florecido! 🌷");

    await loadHabits();
});

// =====================================
// 9. COMPLETAR O DESMARCAR HABITO
// =====================================

async function toggleHabit(id) {
    const today = getToday();
    const alreadyCompleted = completedHabits.has(String(id));

    if (alreadyCompleted) {
        const { error } = await db
            .from("habit_logs")
            .delete()
            .eq("habit_id", id)
            .eq("completed_on", today);

        if (error) {
            notify("No se pudo actualizar: " + error.message);
            return;
        }

        notify("Hábito desmarcado.");
    } else {
        const { error } = await db
            .from("habit_logs")
            .insert([{
                habit_id: id,
                completed_on: today
            }]);

        if (error) {
            notify("No se pudo completar: " + error.message);
            return;
        }

        notify("¡Un pequeño logro más! ♡");
    }

    await loadHabits();
}

// =====================================
// 10. ELIMINAR HABITO
// =====================================

async function deleteHabit(id) {
    const confirmed = confirm(
        "¿Quieres eliminar este hábito y su historial?"
    );

    if (!confirmed) return;

    const { error } = await db
        .from("habits")
        .delete()
        .eq("id", id);

    if (error) {
        notify("No se pudo eliminar: " + error.message);
        return;
    }

    notify("Hábito eliminado.");
    await loadHabits();
}

// =====================================
// 11. CALCULAR PROGRESO
// =====================================

function updateProgress() {
    const total = habits.length;
    const completed = completedHabits.size;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    progressCount.textContent =
        `${completed} de ${total}`;

    progressPercent.textContent =
        `${percentage}%`;

    progressFill.style.width =
        `${percentage}%`;

    if (total === 0) {
        progressMessage.textContent =
            "¡Agrega tu primer hábito y comienza a florecer! 🌷";
    } else if (percentage === 100) {
        progressMessage.textContent =
            "¡Lo lograste! Hoy has cumplido todos tus hábitos. ♡";
    } else if (percentage >= 50) {
        progressMessage.textContent =
            "¡Vas muy bien! Sigue cuidando de ti. 🌸";
    } else {
        progressMessage.textContent =
            "Cada pequeño paso cuenta. ¡Tú puedes! ♡";
    }
}

// =====================================
// 12. FILTRAR POR CATEGORIA
// =====================================

document.getElementById("filters").addEventListener(
    "click",
    (event) => {
        const button = event.target.closest(".filter");

        if (!button) return;

        selectedFilter = button.dataset.filter;

        document.querySelectorAll(".filter").forEach(filter => {
            filter.classList.remove("active");
        });

        button.classList.add("active");

        renderHabits();
    }
);

// =====================================
// 13. INICIAR APLICACION
// =====================================

showDate();
loadHabits();