const state = { tasks: [], filter: "all", editingId: null };
const taskList = document.querySelector("#task-list");
const form = document.querySelector("#task-form");
const formMessage = document.querySelector("#form-message");
const formEyebrow = document.querySelector("#form-eyebrow");
const formTitle = document.querySelector("#form-title");
const submitLabel = document.querySelector("#submit-label");
const cancelEdit = document.querySelector("#cancel-edit");

const formatDate = (value) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );

const isDueSoon = (value) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${value}T00:00:00`);
  const days = (due - today) / 86400000;
  return days >= 0 && days <= 7;
};

function renderStats() {
  const openTasks = state.tasks.filter((task) => !task.is_completed);
  document.querySelector("#total-count").textContent = openTasks.length;
  document.querySelector("#due-count").textContent = openTasks.filter((task) =>
    isDueSoon(task.due_date),
  ).length;
  document.querySelector("#completed-count").textContent = state.tasks.filter(
    (task) => task.is_completed,
  ).length;
}

function taskMarkup(task) {
  const completeLabel = task.is_completed ? "Completed" : "Mark complete";
  const repeat = task.recurrence && task.recurrence !== "None"
    ? `<span class="recurrence">↻ ${task.recurrence}</span>`
    : "";
  return `
    <article class="task ${task.is_completed ? "completed" : ""}">
      <button class="check ${task.is_completed ? "checked" : ""}"
        ${task.is_completed ? "disabled" : `data-complete="${task.id}"`}
        aria-label="${completeLabel}">
        ${task.is_completed ? "✓" : ""}
      </button>
      <div class="task-content">
        <h3>${escapeHtml(task.title)}</h3>
        <div class="task-meta">
          <span class="category">${escapeHtml(task.category)}</span>
          <span class="date ${isDueSoon(task.due_date) && !task.is_completed ? "soon" : ""}">
            ${formatDate(task.due_date)}
          </span>
          ${repeat}
        </div>
      </div>
      <span class="priority ${task.priority.toLowerCase()}">${task.priority}</span>
      <div class="task-actions">
        <button class="icon-button" data-edit="${task.id}" aria-label="Edit task">✎</button>
        <button class="icon-button delete-button" data-delete="${task.id}" aria-label="Delete task">×</button>
      </div>
    </article>
  `;
}

function renderTasks() {
  const visible = state.tasks.filter((task) => {
    if (state.filter === "open") return !task.is_completed;
    if (state.filter === "done") return task.is_completed;
    return true;
  });

  taskList.innerHTML = visible.length
    ? visible.map(taskMarkup).join("")
    : `<div class="empty-state">
        <span>✦</span>
        <h3>${state.filter === "done" ? "Nothing completed yet" : "Your list is clear"}</h3>
        <p>Add a task to get your week organized.</p>
      </div>`;
  renderStats();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

async function loadTasks() {
  const response = await fetch("/api/tasks");
  state.tasks = await response.json();
  renderTasks();
}

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".filter.active").classList.remove("active");
    button.classList.add("active");
    state.filter = button.dataset.filter;
    renderTasks();
  });
});

taskList.addEventListener("click", async (event) => {
  const completeButton = event.target.closest("[data-complete]");
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (completeButton) {
    completeButton.disabled = true;
    const response = await fetch(
      `/api/tasks/${completeButton.dataset.complete}/complete`,
      { method: "PATCH" },
    );
    if (response.ok) await loadTasks();
    else completeButton.disabled = false;
    return;
  }

  if (editButton) {
    const task = state.tasks.find((item) => item.id === Number(editButton.dataset.edit));
    if (task) startEditing(task);
    return;
  }

  if (deleteButton) {
    const task = state.tasks.find((item) => item.id === Number(deleteButton.dataset.delete));
    if (task) await removeTask(task);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";
  const payload = Object.fromEntries(new FormData(form));
  const isEditing = state.editingId !== null;
  const response = await fetch(
    isEditing ? `/api/tasks/${state.editingId}` : "/api/tasks",
    {
    method: isEditing ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const result = await response.json();
    formMessage.textContent = result.error || "Could not add that task.";
    return;
  }

  const message = isEditing ? "Changes saved." : "Task added.";
  resetForm();
  formMessage.textContent = message;
  await loadTasks();
  setTimeout(() => {
    formMessage.textContent = "";
  }, 2500);
});

function startEditing(task) {
  state.editingId = task.id;
  form.elements.title.value = task.title;
  form.elements.category.value = task.category;
  form.elements.due_date.value = task.due_date;
  form.elements.priority.value = task.priority;
  form.elements.recurrence.value = task.recurrence || "None";
  formEyebrow.textContent = "Refine your plan";
  formTitle.textContent = "Edit task";
  submitLabel.textContent = "Save changes";
  cancelEdit.hidden = false;
  form.elements.title.focus();
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetForm() {
  state.editingId = null;
  form.reset();
  form.elements.priority.value = "Medium";
  form.elements.recurrence.value = "None";
  formEyebrow.textContent = "Make a plan";
  formTitle.textContent = "Add a task";
  submitLabel.textContent = "Add to my list";
  cancelEdit.hidden = true;
}

async function removeTask(task) {
  if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
  const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
  if (!response.ok) {
    formMessage.textContent = "Could not delete that task.";
    return;
  }
  if (state.editingId === task.id) resetForm();
  await loadTasks();
}

cancelEdit.addEventListener("click", resetForm);

document.querySelector("#today").textContent = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date());

loadTasks().catch(() => {
  taskList.innerHTML = `<div class="empty-state"><h3>Could not load tasks</h3><p>Refresh the page and try again.</p></div>`;
});