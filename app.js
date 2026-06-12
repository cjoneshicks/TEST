const GOAL_PER_WEEK = 5;
const STORAGE_KEY = "fitness-tracker-workout-days";
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const weekLabelEl = document.getElementById("week-label");
const goalStatusEl = document.getElementById("goal-status");
const progressBarEl = document.getElementById("progress-bar");
const dayListEl = document.getElementById("day-list");
const historyListEl = document.getElementById("history-list");
const prevWeekBtn = document.getElementById("prev-week");
const nextWeekBtn = document.getElementById("next-week");
const markTodayBtn = document.getElementById("mark-today");
const clearWeekBtn = document.getElementById("clear-week");

let workoutDays = loadWorkoutDays();
let weekOffset = 0;

function loadWorkoutDays() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const cleaned = {};
    for (const [date, value] of Object.entries(parsed)) {
      if (typeof date === "string" && value === true) {
        cleaned[date] = true;
      }
    }
    return cleaned;
  } catch (error) {
    return {};
  }
}

function saveWorkoutDays() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workoutDays));
}

function getStartOfWeek(baseDate = new Date()) {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const shift = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + shift + weekOffset * 7);
  return date;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatWeekRange(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const startMonth = startDate.toLocaleDateString(undefined, { month: "short" });
  const endMonth = endDate.toLocaleDateString(undefined, { month: "short" });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const year = endDate.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

function getWeekDates(startDate) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
}

function renderWeek() {
  const startOfWeek = getStartOfWeek();
  const weekDates = getWeekDates(startOfWeek);
  weekLabelEl.textContent = `Week of ${formatWeekRange(startOfWeek)}`;

  dayListEl.innerHTML = "";
  let completedThisWeek = 0;

  weekDates.forEach((date, index) => {
    const key = toDateKey(date);
    const isDone = Boolean(workoutDays[key]);
    if (isDone) {
      completedThisWeek += 1;
    }

    const listItem = document.createElement("li");
    listItem.className = "day-row";

    const labelWrapper = document.createElement("div");
    const dayName = document.createElement("div");
    dayName.className = "day-name";
    dayName.textContent = WEEKDAY_NAMES[index];
    const dayDate = document.createElement("div");
    dayDate.className = "day-date";
    dayDate.textContent = formatDisplayDate(date);
    labelWrapper.append(dayName, dayDate);

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = `day-toggle${isDone ? " done" : ""}`;
    toggleBtn.textContent = isDone ? "Done" : "Mark done";
    toggleBtn.addEventListener("click", () => {
      if (workoutDays[key]) {
        delete workoutDays[key];
      } else {
        workoutDays[key] = true;
      }
      saveWorkoutDays();
      renderWeek();
      renderHistory();
    });

    listItem.append(labelWrapper, toggleBtn);
    dayListEl.appendChild(listItem);
  });

  const goalReached = completedThisWeek >= GOAL_PER_WEEK;
  goalStatusEl.textContent = `${completedThisWeek} / ${GOAL_PER_WEEK} workouts completed this week`;
  goalStatusEl.classList.toggle("goal-met", goalReached);
  const progressPercent = Math.min((completedThisWeek / GOAL_PER_WEEK) * 100, 100);
  progressBarEl.style.width = `${progressPercent}%`;
}

function renderHistory() {
  historyListEl.innerHTML = "";
  const currentWeek = getStartOfWeek(new Date());

  for (let i = 0; i < 8; i += 1) {
    const start = new Date(currentWeek);
    start.setDate(currentWeek.getDate() - i * 7);
    const weekDates = getWeekDates(start);
    const count = weekDates.reduce((total, date) => {
      const key = toDateKey(date);
      return total + (workoutDays[key] ? 1 : 0);
    }, 0);

    const item = document.createElement("li");
    const range = document.createElement("span");
    range.textContent = formatWeekRange(start);
    const result = document.createElement("span");
    result.textContent = `${count} / ${GOAL_PER_WEEK}`;
    result.className = count >= GOAL_PER_WEEK ? "history-good" : "history-miss";
    item.append(range, result);
    historyListEl.appendChild(item);
  }
}

function markToday() {
  const todayKey = toDateKey(new Date());
  workoutDays[todayKey] = true;
  saveWorkoutDays();
  renderWeek();
  renderHistory();
}

function clearVisibleWeek() {
  const start = getStartOfWeek();
  const weekDates = getWeekDates(start);
  weekDates.forEach((date) => {
    delete workoutDays[toDateKey(date)];
  });
  saveWorkoutDays();
  renderWeek();
  renderHistory();
}

prevWeekBtn.addEventListener("click", () => {
  weekOffset -= 1;
  renderWeek();
});

nextWeekBtn.addEventListener("click", () => {
  weekOffset += 1;
  renderWeek();
});

markTodayBtn.addEventListener("click", markToday);
clearWeekBtn.addEventListener("click", clearVisibleWeek);

renderWeek();
renderHistory();
