import {
  fetchIssues, articleHtml, enhanceArticle, getIssueParam,
  issueNo, formatDate
} from "./github.js";
import { Store } from "./store.js";
import { $, $$, toast, openModal, closeModal } from "./app.js";

const article = $("#article");
const readBar = $("#readBar");
const ring = $("#ring");
const ringPct = $("#ringPct");
const tocMount = $("#toc");
const galleryWrap = $("#galleryWrap");
const galleryMount = $("#gallery");

let issue = null;
let gallery = [];
let galleryIndex = 0;
let lastPct = -1;
let readMarked = false;
let saveTimer = null;

function setProgressUI(pct) {
  const value = Math.max(0, Math.min(100, Math.round(pct)));
  if (value === lastPct) return;
  lastPct = value;
  if (readBar) readBar.style.width = `${value}%`;
  if (ring) ring.style.setProperty("--p", value);
  if (ringPct) ringPct.textContent = `${value}%`;
}

function computeProgress() {
  if (!article) return 0;
  const rect = article.getBoundingClientRect();
  const top = rect.top + window.scrollY;
  const height = article.offsetHeight;
  if (!height) return 0;
  const viewBottom = window.scrollY + window.innerHeight * .72;
  return Math.max(0, Math.min(100, ((viewBottom - top) / height) * 100));
}

function onScroll() {
  if (!issue) return;
  const pct = computeProgress();
  setProgressUI(pct);
  if (pct >= 88 && !readMarked) {
    readMarked = true;
    const first = Store.markRead(issue.number);
    if (first) {
      toast("已记为今日阅读。连续天数 +1。", 2600);
      window.dispatchEvent(new Event("dr:updated"));
    }
  }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    Store.setProgress(issue.number, pct);
    Store.setLastIssue(issue.number);
  }, 260);
  spyToc();
}

function spyToc() {
  const links = $$("#toc a");
  if (!links.length) return;
  let active = links[0];
  links.forEach((link) => {
    const target = document.getElementById(link.getAttribute("href").slice(1));
    if (target && target.getBoundingClientRect().top <= 150) active = link;
  });
  links.forEach((link) => link.classList.toggle("active", link === active));
}

function renderToc(toc) {
  if (!tocMount) return;
  if (!toc.length) {
    tocMount.closest(".rail-block")?.remove();
    return;
  }
  tocMount.innerHTML = toc.map((item) => `<a href="#${item.id}">${escapeHtml(item.text)}</a>`).join("");
  tocMount.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", (event) => {
      event.preventDefault();
      document.getElementById(a.getAttribute("href").slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderHeader() {
  document.title = `${issue.title} · The Daily Read`;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", `${issue.title} — ${issue.hook} 英文外刊每日精读第 ${issueNo(issue.number)} 期。`);
  $("#topIssue").textContent = `ISSUE ${issueNo(issue.number)}`;
  const topRead = $("#topRead");
  if (topRead) topRead.textContent = `${issue.readingTime} MIN READ`;
  const footerLabel = $("#issueFooterLabel");
  if (footerLabel) footerLabel.textContent = `THE DAILY READ · ISSUE ${issueNo(issue.number)}`;
  $("#issueKicker").innerHTML = `ISSUE ${issueNo(issue.number)} <span>·</span> ${escapeHtml(issue.topicLabel).toUpperCase()} <span>·</span> ${formatDate(issue.createdAt)}`;
  $("#issueTitle").textContent = issue.title;
  $("#issueHook").textContent = issue.hook || "今天，读一篇值得留下来的外刊。";
  $("#issueMeta").innerHTML = `
    <span class="pill">${escapeHtml(issue.source)}</span>
    <span class="pill">${issue.readingTime} MIN READ</span>
    <span class="pill accent">考研 + / C1</span>`;
  const cover = $("#issueCover");
  if (cover) {
    cover.src = issue.leadImage || issue.cover;
    cover.alt = issue.title;
  }
  $("#issueCredit").textContent = `IMAGE / ${issue.source.toUpperCase()}`;
  $("#sourceMeta").innerHTML = `${escapeHtml(issue.source)}<br>${formatDate(issue.createdAt, "long")}<br>${issue.meta ? escapeHtml(issue.meta) : ""}`;
  const original = $("#originalLink");
  if (original) {
    if (issue.sourceUrl) original.href = issue.sourceUrl;
    else original.style.display = "none";
  }
  $("#railMeta").innerHTML = `${issue.readingTime} min · ${escapeHtml(issue.topicLabel)}<br>读到 88% 会自动记为已读。`;
}

function renderNav(issues) {
  const index = issues.findIndex((x) => x.number === issue.number);
  const older = issues[index + 1];
  const newer = issues[index - 1];
  const mount = $("#issueNav");
  if (!mount) return;
  mount.innerHTML = [
    older ? `<a href="./issue.html?n=${older.number}"><b>← PREVIOUS</b>${escapeHtml(older.title)}</a>` : `<span></span>`,
    newer ? `<a href="./issue.html?n=${newer.number}" style="text-align:right"><b>NEXT →</b>${escapeHtml(newer.title)}</a>` : `<a href="./archive.html" style="text-align:right"><b>ARCHIVE →</b>全部期数</a>`
  ].join("");
}

function showGallery(index) {
  if (!gallery.length) return;
  galleryIndex = (index + gallery.length) % gallery.length;
  openModal(`<img src="${gallery[galleryIndex]}" alt="${escapeHtml(issue.title)} 图文版第 ${galleryIndex + 1} 页">`);
  const inner = $(".modal-inner");
  inner.insertAdjacentHTML("beforeend", `
    <button class="modal-nav prev" type="button" aria-label="上一页">‹</button>
    <button class="modal-nav next" type="button" aria-label="下一页">›</button>
    <div class="modal-count">${galleryIndex + 1} / ${gallery.length}</div>`);
  $(".modal-nav.prev", inner)?.addEventListener("click", () => showGallery(galleryIndex - 1));
  $(".modal-nav.next", inner)?.addEventListener("click", () => showGallery(galleryIndex + 1));
}

function renderGallery() {
  if (!gallery.length || !galleryMount || !galleryWrap) return;
  galleryWrap.hidden = false;
  galleryMount.innerHTML = gallery.map((src, i) => `
    <button type="button" aria-label="查看第 ${i + 1} 页">
      <img src="${src}" alt="${escapeHtml(issue.title)} 第 ${i + 1} 页" loading="lazy">
    </button>`).join("");
  galleryMount.querySelectorAll("button").forEach((btn, i) => {
    btn.addEventListener("click", () => showGallery(i));
  });
  document.addEventListener("keydown", (event) => {
    if (!$("#modal")?.classList.contains("open")) return;
    if (event.key === "ArrowLeft") showGallery(galleryIndex - 1);
    if (event.key === "ArrowRight") showGallery(galleryIndex + 1);
  });
}

function wireActions() {
  $("#markRead")?.addEventListener("click", () => {
    Store.markRead(issue.number);
    Store.setProgress(issue.number, 100);
    setProgressUI(100);
    toast("已标记为读完。");
    window.dispatchEvent(new Event("dr:updated"));
  });

  $("#copyLink")?.addEventListener("click", async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast("链接已复制。");
    } catch {
      toast("复制失败，请从地址栏复制。");
    }
  });

  $("#shareBtn")?.addEventListener("click", async () => {
    const data = { title: `${issue.title} · The Daily Read`, text: issue.hook, url: window.location.href };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("链接已复制，可以分享了。");
    } catch {
      toast("分享失败，请复制地址栏链接。");
    }
  });

  $("#openGallery")?.addEventListener("click", () => {
    if (gallery.length) showGallery(0);
    else toast("这一期还没有上传图文版。");
  });

  article?.addEventListener("click", (event) => {
    const btn = event.target.closest(".word-save");
    if (!btn) return;
    const word = btn.dataset.word;
    if (Store.isWordSaved(word)) {
      Store.removeWord(word);
      btn.textContent = "+";
      btn.classList.remove("saved");
      toast(`已从词书移除：${word}`);
    } else {
      Store.addWord({
        word,
        ipa: btn.dataset.ipa,
        meaning: btn.dataset.meaning,
        collocation: btn.dataset.collocation,
        issue: btn.dataset.issue,
        issueTitle: btn.dataset.issueTitle
      });
      btn.textContent = "✓";
      btn.classList.add("saved");
      toast(`已加入词书：${word}`);
    }
    window.dispatchEvent(new Event("dr:updated"));
  });
}

function renderError(message) {
  if (article) {
    article.innerHTML = `
      <div style="border-top:2px solid var(--ink);padding-top:18px">
        <div class="eyebrow">COULD NOT LOAD</div>
        <h2 style="border:0;padding:0;margin-top:12px">这一期暂时没有加载出来。</h2>
        <p>${escapeHtml(message)}</p>
        <p><a href="./archive.html">去档案页看看</a>，或稍后刷新。</p>
      </div>`;
  }
}

async function init() {
  try {
    const issues = await fetchIssues();
    if (!issues.length) throw new Error("还没有已发布的期。");
    const wanted = getIssueParam();
    issue = wanted
      ? issues.find((x) => String(x.number) === String(wanted)) || issues[0]
      : issues[0];

    renderHeader();
    article.innerHTML = articleHtml(issue);
    const toc = enhanceArticle(article, issue);
    renderToc(toc);
    wireActions();
    renderNav(issues);
    gallery = issue.gallery || [];
    renderGallery();

    Store.setLastIssue(issue.number);
    const pct = Store.getProgress(issue.number);
    setProgressUI(pct);
    readMarked = Store.isRead(issue.number);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  } catch (err) {
    renderError(err.message || "未知错误");
  }
}

init();
