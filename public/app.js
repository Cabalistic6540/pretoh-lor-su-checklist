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
let audioContext = null;

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "บันทึกไม่สำเร็จ");
  return payload;
}

function playTickSound(checked) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    const first = audioContext.createOscillator();
    first.type = "sine";
    first.frequency.setValueAtTime(checked ? 660 : 420, now);
    first.frequency.exponentialRampToValueAtTime(checked ? 980 : 300, now + 0.12);
    first.connect(gain);
    first.start(now);
    first.stop(now + 0.18);

    if (checked) {
      const sparkle = audioContext.createOscillator();
      sparkle.type = "triangle";
      sparkle.frequency.setValueAtTime(1320, now + 0.04);
      sparkle.connect(gain);
      sparkle.start(now + 0.04);
      sparkle.stop(now + 0.14);
    }
  } catch (error) {
    console.warn("Tick sound unavailable", error);
  }
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
