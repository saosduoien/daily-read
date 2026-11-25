import { fetchIssues, formatDate, issueNo } from "./github.js";
import { Store } from "./store.js";
import { $, escapeHtml, toast } from "./app.js";

let all = [];
let topic = "all";
let query = "";

function card(issue) {
  const pct = Store.getProgress(issue.number);
  const read = Store.isRead(issue.number);
  return `
    <a class="archive-card" href="./issue.html?n=${issue.number}">
      <img src="${escapeHtml(issue.cover)}" alt="${escapeHtml(issue.title)}" loading="lazy">
      <div class="body">
        <div class="kicker"><b>NO. ${issueNo(issue.series)}</b> &nbsp;·&nbsp; ${escapeHtml(issue.topicLabel).toUpperCase()} &nbsp;·&nbsp; ${formatDate(issue.createdAt)}</div>
        <h3>${escapeHtml(issue.title)}</h3>
        <p>${escapeHtml(issue.hook || issue.excerpt || "")}</p>
        <div class="foot">
          <span>${issue.readingTime} MIN ${read ? "· READ" : ""}</span>
          <span>${pct ? `${pct}%` : "OPEN →"}</span>
        </div>
      </div>
    </a>`;
}

function render() {
  const list = $("#archiveList");
  if (!list) return;
  const q = query.trim().toLowerCase();
  const filtered = all.filter((issue) => {
    const topicOk = topic === "all" || issue.topic === topic;
    const text = `${issue.title} ${issue.hook} ${issue.excerpt} ${issue.body}`.toLowerCase();
    return topicOk && (!q || text.includes(q));
  });
  $("#issueCount").textContent = `${filtered.length} ISSUE${filtered.length === 1 ? "" : "S"}`;
  if (!filtered.length) {
    list.innerHTML = `<div class="empty">没有找到匹配的期。试试别的关键词，或清空筛选。</div>`;
    return;
  }
  list.innerHTML = filtered.map(card).join("");
}

function renderFilters() {
  const mount = $("#filters");
  if (!mount) return;
  const topics = [...new Map(all.map((i) => [i.topic, i.topicLabel])).entries()];
  mount.innerHTML = [
    `<button class="filter${topic === "all" ? " active" : ""}" type="button" data-topic="all">ALL</button>`,
    ...topics.map(([key, label]) => `<button class="filter${topic === key ? " active" : ""}" type="button" data-topic="${escapeHtml(key)}">${escapeHtml(label)}</button>`)
  ].join("");
  mount.querySelectorAll(".filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      topic = btn.dataset.topic;
      renderFilters();
      render();
    });
  });
}

function init() {
  $("#searchInput")?.addEventListener("input", (event) => {
    query = event.target.value;
    render();
  });
  const params = new URLSearchParams(location.search);
  if (params.get("q")) {
    query = params.get("q");
    const input = $("#searchInput");
    if (input) input.value = query;
  }
  fetchIssues()
    .then((issues) => {
      all = issues;
      renderFilters();
      render();
    })
    .catch(() => {
      $("#archiveList").innerHTML = `<div class="empty">暂时无法连接内容源。请稍后刷新。</div>`;
      toast("档案加载失败。");
    });
}

init();
