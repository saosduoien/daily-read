const PREFIX = "dr_v1_";

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key) {
  try { localStorage.removeItem(PREFIX + key); } catch {}
}

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const Store = {
  get(key, fallback) { return safeGet(key, fallback); },
  set(key, value) { return safeSet(key, value); },
  remove,

  getTheme() {
    return safeGet("theme", "paper") === "night" ? "night" : "paper";
  },
  setTheme(theme) {
    safeSet("theme", theme);
  },

  getProgress(id) {
    return Number(safeGet(`progress_${id}`, 0)) || 0;
  },
  setProgress(id, pct) {
    const value = Math.max(0, Math.min(100, Math.round(pct)));
    safeSet(`progress_${id}`, value);
    if (value >= 88) this.markRead(id);
    return value;
  },

  isRead(id) {
    return safeGet(`read_${id}`, false) === true;
  },
  markRead(id) {
    const first = !this.isRead(id);
    safeSet(`read_${id}`, true);
    const ids = new Set(safeGet("read_issues", []));
    ids.add(String(id));
    safeSet("read_issues", [...ids]);
    if (first) this.recordRead();
    return first;
  },
  readIssues() {
    return safeGet("read_issues", []).map(String);
  },

  recordRead(date = new Date()) {
    const key = dateKey(date);
    const dates = new Set(safeGet("read_dates", []));
    dates.add(key);
    safeSet("read_dates", [...dates]);
  },
  readDates() {
    return new Set(safeGet("read_dates", []));
  },
  streak() {
    const dates = this.readDates();
    let cursor = startOfToday();
    if (!dates.has(dateKey(cursor))) cursor = addDays(cursor, -1);
    let count = 0;
    while (dates.has(dateKey(cursor))) {
      count += 1;
      cursor = addDays(cursor, -1);
    }
    return count;
  },
  last14() {
    const dates = this.readDates();
    const out = [];
    const today = startOfToday();
    for (let i = 13; i >= 0; i -= 1) {
      const d = addDays(today, -i);
      out.push({ key: dateKey(d), on: dates.has(dateKey(d)), today: i === 0 });
    }
    return out;
  },

  words() {
    return safeGet("words", []);
  },
  saveWords(words) {
    safeSet("words", words);
  },
  isWordSaved(word) {
    const w = String(word || "").toLowerCase();
    return this.words().some((x) => String(x.word).toLowerCase() === w);
  },
  addWord(entry) {
    const word = String(entry.word || "").trim();
    if (!word) return false;
    const list = this.words();
    if (list.some((x) => String(x.word).toLowerCase() === word.toLowerCase())) return false;
    list.unshift({
      word,
      ipa: entry.ipa || "",
      meaning: entry.meaning || "",
      collocation: entry.collocation || "",
      issue: String(entry.issue || ""),
      issueTitle: entry.issueTitle || "",
      addedAt: new Date().toISOString(),
      box: 0,
      nextReview: dateKey(addDays(new Date(), 1))
    });
    this.saveWords(list);
    return true;
  },
  removeWord(word) {
    const w = String(word || "").toLowerCase();
    this.saveWords(this.words().filter((x) => String(x.word).toLowerCase() !== w));
  },
  reviewWord(word, grade) {
    const w = String(word || "").toLowerCase();
    const list = this.words();
    const item = list.find((x) => String(x.word).toLowerCase() === w);
    if (!item) return;
    const intervals = [0, 1, 3, 7, 14, 30];
    if (grade === "again") {
      item.box = 0;
      item.nextReview = dateKey(addDays(new Date(), 1));
    } else {
      item.box = Math.min(5, (Number(item.box) || 0) + 1);
      item.nextReview = dateKey(addDays(new Date(), intervals[item.box]));
    }
    this.saveWords(list);
  },
  dueWords() {
    const today = dateKey();
    return this.words().filter((x) => !x.nextReview || x.nextReview <= today);
  },

  lastIssue() {
    return safeGet("last_issue", null);
  },
  setLastIssue(id) {
    safeSet("last_issue", String(id));
  },

  stats() {
    return {
      streak: this.streak(),
      read: this.readIssues().length,
      words: this.words().length
    };
  }
};
