import { fetchIssues, formatDate, issueNo } from "./github.js";
import { Store } from "./store.js";
import { $, escapeHtml, toast } from "./app.js";

const CFG = window.DR_CONFIG || {};

function progressOf(id) {
  return Store.getProgress(id);
}

function renderHero(issue) {
  const title = $("#heroTitle");
  if (title) title.textContent = issue.title;
  const cn = $(".hero-cn");
  if (cn) {
    const hook = issue.hook || "今天，读一篇值得留下来的外刊。";
    const cut = hook.indexOf("，");
    if (cut > 0) {
      cn.innerHTML = `${escapeHtml(hook.slice(0, cut))}，<span class="thin">${escapeHtml(hook.slice(cut + 1))}</span>`;
    } else {
      cn.textContent = hook;
    }
  }
  const dek = $(".hero-dek");
  if (dek) dek.textContent = issue.excerpt || "精读、词汇、长难句与论证地图，一次读完。";
  const topIssue = $("#topIssueLabel");
  if (topIssue) topIssue.textContent = `第 ${issueNo(issue.number)} 期`;
  const topMinutes = $("#topMinutes");
  if (topMinutes) topMinutes.textContent = `${String(issue.readingTime).padStart(2, "0")} MIN`;
  const img = $(".hero-art img");
  if (img) {
    img.src = issue.leadImage || issue.cover;
    img.alt = issue.title;
  }
  const credit = $("#heroCredit");
  if (credit) credit.textContent = (issue.source || "THE DAILY READ").toUpperCase();
  const stamp = $(".issue-stamp");
  if (stamp) {
    stamp.innerHTML = `<b>${issueNo(issue.number)}</b>${escapeHtml(issue.topicLabel).toUpperCase()} / ${formatDate(issue.createdAt)}`;
  }
  const meta = $(".hero-meta");
  if (meta) {
    meta.innerHTML = `
      <span class="pill">${escapeHtml(issue.source)}</span>
      <span class="pill">${issue.readingTime} MIN READ</span>
      <span class="pill">${formatDate(issue.createdAt)}</span>
      <span class="pill accent">考研 + / C1</span>`;
  }
  const read = $(".hero-actions a");
  if (read) read.href = `./issue.html?n=${issue.number}`;
  const carousel = $(".hero-actions a:nth-child(2)");
  if (carousel) carousel.href = `./issue.html?n=${issue.number}#gallery`;
  const galleryLabel = $("#heroGalleryLabel");
  if (galleryLabel) {
    galleryLabel.textContent = issue.gallery?.length ? `看 ${issue.gallery.length} 页图文` : "看图文版";
  }
  const pct = progressOf(issue.number);
  const bar = $("#heroProgress");
  if (bar) bar.style.width = `${pct}%`;
  const txt = $("#heroProgressText");
  if (txt) txt.textContent = `${pct}%`;
}

function renderRecent(issues) {
  const mount = $("#recentGrid");
  if (!mount) return;
  const cards = issues.slice(0, 3).map((issue) => {
    const pct = progressOf(issue.number);
    return `
      <a class="issue-card" href="./issue.html?n=${issue.number}">
        <div class="cover">
          <img src="${escapeHtml(issue.cover)}" alt="${escapeHtml(issue.title)}" loading="lazy">
          <span class="tag">NO. ${issueNo(issue.number)}</span>
        </div>
        <div class="body">
          <div class="kicker"><b>${escapeHtml(issue.topicLabel).toUpperCase()}</b><span>·</span><span>${formatDate(issue.createdAt)}</span></div>
          <h3>${escapeHtml(issue.title)}</h3>
          <p>${escapeHtml(issue.hook)}</p>
          <div class="progress"><i style="width:${pct}%"></i></div>
        </div>
      </a>`;
  });

  while (cards.length < 2) {
    const next = CFG.nextIssue || { number: "002", title: "下一期", topic: "COMING NEXT" };
    cards.push(`
      <a class="issue-card coming" href="./studio.html">
        <div class="cover"><span class="plus">${escapeHtml(next.number)}</span></div>
        <div class="body">
          <div class="kicker"><b>COMING NEXT</b><span>·</span><span>${escapeHtml(next.date || "")}</span></div>
          <h3>${escapeHtml(next.title)}</h3>
          <p>${escapeHtml(next.topic || "下一期正在路上。")}</p>
        </div>
      </a>`);
  }

  cards.push(`
    <a class="issue-card" href="./archive.html">
      <div class="cover" style="background:var(--ink);display:grid;place-items:center;color:var(--paper)">
        <span style="font:500 84px/.9 var(--serif);letter-spacing:-.06em;color:var(--accent)">→</span>
      </div>
      <div class="body">
        <div class="kicker"><b>THE ARCHIVE</b><span>·</span><span>ALL ISSUES</span></div>
        <h3>把读过的，留下来。</h3>
        <p>按主题、时间和关键词翻找你的阅读档案。</p>
      </div>
    </a>`);

  mount.innerHTML = cards.slice(0, 3).join("");
}

function renderContinue(issues) {
  const mount = $("#continueMount");
  if (!mount || !issues.length) return;
  const lastId = Store.lastIssue();
  const issue = issues.find((x) => String(x.number) === String(lastId)) || issues[0];
  const pct = progressOf(issue.number);
  const label = pct > 0 ? `继续阅读 · ${pct}%` : "从今日开始";
  mount.innerHTML = `
    <a class="continue" href="./issue.html?n=${issue.number}">
      <img src="${escapeHtml(issue.cover)}" alt="" loading="lazy">
      <div>
        <div class="eyebrow" style="margin-bottom:5px">${label}</div>
        <h4>${escapeHtml(issue.title)}</h4>
        <p>${escapeHtml(issue.hook)} · 约 ${issue.readingTime} 分钟。</p>
      </div>
      <span class="go" aria-hidden="true">→</span>
    </a>`;
}

async function init() {
  const pct = progressOf(1);
  const bar = $("#heroProgress");
  if (bar) bar.style.width = `${pct}%`;
  const txt = $("#heroProgressText");
  if (txt) txt.textContent = `${pct}%`;
  const card = $("#cardProgress1");
  if (card) card.style.width = `${pct}%`;

  try {
    const issues = await fetchIssues();
    if (!issues.length) throw new Error("empty");
    renderHero(issues[0]);
    renderRecent(issues);
    renderContinue(issues);
  } catch {
    toast("暂时无法连接内容源，先显示本地预览。", 3200);
  }
}

init();
