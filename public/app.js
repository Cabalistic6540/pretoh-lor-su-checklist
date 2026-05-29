const state = {
  categories: [],
  people: [],
  checks: {},
  updatedAt: null,
  activePersonId: localStorage.getItem("activePersonId") || ""
};

const checklistWrap = document.querySelector("#checklistWrap");
const missingList = document.querySelector("#missingList");
const personForm = document.querySelector("#personForm");
const categoryForm = document.querySelector("#categoryForm");
const syncStatus = document.querySelector("#syncStatus");
const activePerson = document.querySelector("#activePerson");
const peopleCount = document.querySelector("#peopleCount");
const itemCount = document.querySelector("#itemCount");
const missingCount = document.querySelector("#missingCount");
const lastUpdated = document.querySelector("#lastUpdated");
const emptyTemplate = document.querySelector("#emptyTemplate");

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "บันทึกไม่สำเร็จ");
  return payload;
}

function allItems() {
  return state.categories.flatMap((category) => category.items);
}

function isChecked(personId, itemId) {
  return Boolean(state.checks[personId]?.[itemId]);
}

function activePersonRecord() {
  return state.people.find((person) => person.id === state.activePersonId) || null;
}

function formatTime(value) {
  if (!value) return "ยังไม่มีข้อมูลล่าสุด";
  return `อัปเดตล่าสุด ${new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value))}`;
}

function updateSummary() {
  const items = allItems();
  peopleCount.textContent = state.people.length;
  itemCount.textContent = items.length;
  missingCount.textContent = state.people.reduce((sum, person) => {
    return sum + items.filter((item) => !isChecked(person.id, item.id)).length;
  }, 0);
  lastUpdated.textContent = formatTime(state.updatedAt);
}

function renderEmpty() {
  checklistWrap.replaceChildren(emptyTemplate.content.cloneNode(true));
}

function getMissingItems(person) {
  return state.categories.flatMap((category) => {
    return category.items
      .filter((item) => !isChecked(person.id, item.id))
      .map((item) => ({ ...item, category: category.title }));
  });
}

function createAddItemForm(category) {
  const form = document.createElement("form");
  form.className = "add-item-form";
  form.dataset.categoryId = category.id;

  const input = document.createElement("input");
  input.name = "text";
  input.placeholder = `เพิ่มรายการในหมวด ${category.title}`;
  input.autocomplete = "off";
  input.required = true;

  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "เพิ่มรายการ";

  form.append(input, button);
  return form;
}

function createIconButton(label, action, id) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.dataset.action = action;
  if (id) button.dataset.id = id;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.textContent = "×";
  return button;
}

function renderChecklist() {
  const person = activePersonRecord();
  if (!person) {
    renderEmpty();
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const category of state.categories) {
    const card = document.createElement("article");
    card.className = "category-card";

    const header = document.createElement("div");
    header.className = "card-header";
    const title = document.createElement("h3");
    title.textContent = category.title;
    header.append(title, createIconButton(`ลบหมวด ${category.title}`, "delete-category", category.id));
    card.append(header);

    const list = document.createElement("div");
    list.className = "item-list";

    for (const item of category.items) {
      const label = document.createElement("label");
      label.className = "check-row";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = isChecked(person.id, item.id);
      checkbox.dataset.personId = person.id;
      checkbox.dataset.itemId = item.id;
      checkbox.setAttribute("aria-label", `${person.name} มี ${item.text} แล้ว`);

      const text = document.createElement("span");
      text.textContent = item.text;
      label.append(checkbox, text, createIconButton(`ลบ ${item.text}`, "delete-item", item.id));
      list.append(label);
    }

    card.append(list, createAddItemForm(category));
    fragment.append(card);
  }

  checklistWrap.replaceChildren(fragment);
}

function renderMissingList() {
  if (!state.people.length) {
    missingList.innerHTML = '<div class="mini-empty">ยังไม่มีชื่อเพื่อน</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const person of state.people) {
    const missing = getMissingItems(person);
    const card = document.createElement("article");
    card.className = "missing-card";

    const header = document.createElement("div");
    header.className = "missing-header";
    const name = document.createElement("h3");
    name.textContent = person.name;
    const actions = document.createElement("div");
    actions.className = "missing-actions";
    const badge = document.createElement("span");
    badge.className = missing.length ? "badge warn" : "badge ok";
    badge.textContent = missing.length ? `ขาด ${missing.length}` : "ครบแล้ว";
    actions.append(badge, createIconButton(`ลบชื่อ ${person.name}`, "delete-person", person.id));
    header.append(name, actions);
    card.append(header);

    if (missing.length) {
      const ul = document.createElement("ul");
      for (const item of missing.slice(0, 10)) {
        const li = document.createElement("li");
        li.textContent = `${item.text} (${item.category})`;
        ul.append(li);
      }
      if (missing.length > 10) {
        const li = document.createElement("li");
        li.className = "more";
        li.textContent = `และอีก ${missing.length - 10} รายการ`;
        ul.append(li);
      }
      card.append(ul);
    } else {
      const done = document.createElement("p");
      done.className = "done-text";
      done.textContent = "ของพร้อมแล้ว";
      card.append(done);
    }

    fragment.append(card);
  }

  missingList.replaceChildren(fragment);
}

function renderActivePerson() {
  const person = activePersonRecord();
  if (person) {
    const missing = getMissingItems(person).length;
    activePerson.textContent = `กำลังติ๊กของ ${person.name} · ${missing === 0 ? "ครบแล้ว" : `ยังขาด ${missing} รายการ`}`;
    activePerson.classList.add("is-active");
  } else {
    activePerson.textContent = "ยังไม่ได้เลือกชื่อ";
    activePerson.classList.remove("is-active");
  }
}

function render() {
  updateSummary();
  renderActivePerson();
  renderChecklist();
  renderMissingList();
}

function applyState(data) {
  Object.assign(state, {
    categories: data.categories || [],
    people: data.people || [],
    checks: data.checks || {},
    updatedAt: data.updatedAt || null
  });

  if (!activePersonRecord()) {
    state.activePersonId = "";
    localStorage.removeItem("activePersonId");
  }

  syncStatus.textContent = "ซิงก์แล้ว";
  render();
}

async function refresh(showLoading = false) {
  try {
    if (showLoading) syncStatus.textContent = "กำลังโหลด";
    const data = await request("/api/state");
    applyState(data);
  } catch (error) {
    syncStatus.textContent = "เชื่อมต่อไม่ได้";
    console.error(error);
  }
}

function connectRealtime() {
  if (!("EventSource" in window)) {
    setInterval(() => refresh(), 5000);
    return;
  }

  const events = new EventSource("/api/events");
  events.onmessage = (event) => applyState(JSON.parse(event.data));
  events.onerror = () => {
    syncStatus.textContent = "กำลังต่อใหม่";
  };
}

personForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = personForm.elements.name;
  try {
    const data = await request("/api/people", {
      method: "POST",
      body: JSON.stringify({ name: input.value })
    });
    applyState(data);
    const person = state.people.find((entry) => entry.name.toLowerCase() === input.value.trim().toLowerCase());
    if (person) {
      state.activePersonId = person.id;
      localStorage.setItem("activePersonId", person.id);
    }
    input.value = "";
    render();
  } catch (error) {
    alert(error.message);
  }
});

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = categoryForm.elements.title;
  try {
    await request("/api/categories", {
      method: "POST",
      body: JSON.stringify({ title: input.value })
    });
    input.value = "";
    await refresh();
  } catch (error) {
    alert(error.message);
  }
});

checklistWrap.addEventListener("change", async (event) => {
  const checkbox = event.target.closest("input[type='checkbox']");
  if (!checkbox) return;

  try {
    await request("/api/checks", {
      method: "PATCH",
      body: JSON.stringify({
        personId: checkbox.dataset.personId,
        itemId: checkbox.dataset.itemId,
        checked: checkbox.checked
      })
    });
    await refresh();
  } catch (error) {
    alert(error.message);
    checkbox.checked = !checkbox.checked;
  }
});

checklistWrap.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  const messages = {
    "delete-item": "ลบรายการนี้ใช่ไหม?",
    "delete-category": "ลบหมวดนี้พร้อมรายการทั้งหมดใช่ไหม?"
  };
  const paths = {
    "delete-item": `/api/items/${encodeURIComponent(id)}`,
    "delete-category": `/api/categories/${encodeURIComponent(id)}`
  };

  if (!paths[action] || !confirm(messages[action])) return;
  try {
    await request(paths[action], { method: "DELETE" });
    await refresh();
  } catch (error) {
    alert(error.message);
  }
});

missingList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action='delete-person']");
  if (!button) return;
  if (!confirm("ลบชื่อนี้และข้อมูลที่ติ๊กไว้ใช่ไหม?")) return;

  try {
    await request(`/api/people/${encodeURIComponent(button.dataset.id)}`, { method: "DELETE" });
    await refresh();
  } catch (error) {
    alert(error.message);
  }
});

checklistWrap.addEventListener("submit", async (event) => {
  const form = event.target.closest(".add-item-form");
  if (!form) return;
  event.preventDefault();

  const input = form.elements.text;
  try {
    await request("/api/items", {
      method: "POST",
      body: JSON.stringify({
        categoryId: form.dataset.categoryId,
        text: input.value
      })
    });
    input.value = "";
    await refresh();
  } catch (error) {
    alert(error.message);
  }
});

refresh(true);
connectRealtime();
