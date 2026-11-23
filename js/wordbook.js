import { Store } from "./store.js";
import { $, $$, escapeHtml, toast } from "./app.js";

let query = "";
let session = [];
let cursor = 0;
let revealed = false;

function wordItem(item) {
  return `
    <article class="word-item" data-word="${escapeHtml(item.word)}">
      <button class="remove" type="button" aria-label="移除 ${escapeHtml(item.word)}" title="移除">×</button>
      <div class="top">
        <h3>${escapeHtml(item.word)}</h3>
        <span class="ipa">${escapeHtml(item.ipa || "")}</span>
      </div>
      <div class="meaning">${escapeHtml(item.meaning || "")}</div>
      ${item.collocation ? `<div class="coll">${escapeHtml(item.collocation)}</div>` : ""}
      <div class="source">${item.issue ? `FROM ISSUE ${String(item.issue).padStart(3, "0")} · ${escapeHtml(item.issueTitle || "")}` : "PERSONAL WORD BOOK"}</div>
    </article>`;
}

function renderList() {
  const words = Store.words();
  const q = query.trim().toLowerCase();
  const filtered = words.filter((w) => !q || `${w.word} ${w.meaning} ${w.collocation}`.toLowerCase().includes(q));
  const mount = $("#wordList");
  $("#wordCount").textContent = `${words.length} WORD${words.length === 1 ? "" : "S"}`;
  const due = Store.dueWords().length;
  $("#duePill").textContent = `${due} DUE`;
  $("#reviewBtn").disabled = words.length === 0;
  if (!words.length) {
    mount.innerHTML = `<div class="empty">还没有收藏单词。去今日精读，点单词旁边的 <b>+</b>。</div>`;
    return;
  }
  if (!filtered.length) {
    mount.innerHTML = `<div class="empty">没有找到匹配的词。</div>`;
    return;
  }
  mount.innerHTML = filtered.map(wordItem).join("");
  $$(".word-item .remove", mount).forEach((btn) => {
    btn.addEventListener("click", () => {
      const word = btn.closest(".word-item").dataset.word;
      Store.removeWord(word);
      toast(`已移除：${word}`);
      renderList();
      window.dispatchEvent(new Event("dr:updated"));
    });
  });
}

function renderReview() {
  const card = $("#reviewCard");
  if (!card || !session.length) return;
  const item = session[cursor];
  revealed = false;
  card.classList.remove("revealed");
  $("#reviewWord").textContent = item.word;
  $("#reviewIpa").textContent = item.ipa || "";
  $("#reviewMeaning").textContent = item.meaning || "（暂无释义）";
  $("#reviewColl").textContent = item.collocation || "";
  $("#reviewProgress").textContent = `${cursor + 1} / ${session.length}`;
  $("#revealBtn").classList.remove("hidden");
  $("#againBtn").classList.add("hidden");
  $("#goodBtn").classList.add("hidden");
}

function startReview() {
  const words = Store.words();
  if (!words.length) {
    toast("词书还是空的。先去精读页收藏几个词。");
    return;
  }
  const due = Store.dueWords();
  session = (due.length ? due : words).slice();
  cursor = 0;
  $("#reviewShell").hidden = false;
  renderReview();
  $("#reviewShell").scrollIntoView({ behavior: "smooth", block: "start" });
}

function endReview() {
  $("#reviewShell").hidden = true;
  session = [];
  renderList();
}

function reveal() {
  if (!session.length) return;
  revealed = true;
  $("#reviewCard").classList.add("revealed");
  $("#revealBtn").classList.add("hidden");
  $("#againBtn").classList.remove("hidden");
  $("#goodBtn").classList.remove("hidden");
}

function grade(value) {
  if (!session.length) return;
  const item = session[cursor];
  Store.reviewWord(item.word, value);
  if (cursor + 1 >= session.length) {
    toast("这一轮复习完成。");
    endReview();
    return;
  }
  cursor += 1;
  renderReview();
}

function init() {
  renderList();
  $("#reviewBtn")?.addEventListener("click", startReview);
  $("#endReview")?.addEventListener("click", endReview);
  $("#revealBtn")?.addEventListener("click", reveal);
  $("#againBtn")?.addEventListener("click", () => grade("again"));
  $("#goodBtn")?.addEventListener("click", () => grade("good"));
  $("#wordSearch")?.addEventListener("input", (event) => {
    query = event.target.value;
    renderList();
  });
  window.addEventListener("dr:updated", renderList);
}

init();
