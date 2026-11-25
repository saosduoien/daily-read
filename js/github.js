import { Store, dateKey } from "./store.js";

const CFG = window.DR_CONFIG || {};
const CACHE_MS = 20 * 1000;

export function issueNo(n) {
  return String(n || 0).padStart(3, "0");
}

export function formatDate(value, style = "short") {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  if (style === "long") {
    return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(d);
  }
  if (style === "month") {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
  }
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })
    .format(d).replaceAll("/", ".");
}

export function topicOf(labels = []) {
  const names = labels.map((l) => (typeof l === "string" ? l : l.name)).filter(Boolean);
  const key = names.find((n) => !["published", "featured", "draft"].includes(n)) || "reading";
  const map = CFG.topics || {};
  return { key, label: map[key] || key.replaceAll("-", " ") };
}

function parseLeadingMeta(md = "") {
  const match = md.match(/^\s*((?:>\s?.*(?:\r?\n|$))+)/);
  if (!match) return { hook: "", meta: "" };
  const lines = match[1].split(/\r?\n/)
    .map((line) => line.replace(/^>\s?/, "").trim())
    .filter(Boolean);
  const meta = lines[1] || "";
  const seriesToken = meta.split("·").map((s) => s.trim()).find((s) => /^\d{1,3}$/.test(s));
  return {
    hook: lines[0] || "",
    meta,
    sourceUrl: lines[2] || "",
    series: seriesToken ? Number(seriesToken) : null
  };
}

function imageUrls(md = "") {
  const out = [];
  const mdRe = /!\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  let m;
  while ((m = mdRe.exec(md))) out.push(m[1]);
  const htmlRe = /<img[^>]+src=["']([^"']+)["']/gi;
  while ((m = htmlRe.exec(md))) out.push(m[1]);
  return [...new Set(out)];
}

function firstImage(md = "") {
  return imageUrls(md)[0] || "";
}

function stripHero(md = "") {
  let out = md;
  out = out.replace(/^\s*(?:>\s?[^\n]*(?:\n|$))+/, "");
  out = out.replace(/^\s*!\[[^\]]*\]\([^)]*\)\s*(?:\n|$)/, "");
  out = out.replace(/^\s*#\s+[^\n]+\s*(?:\n|$)/, "");
  return out.replace(/^\s+/, "");
}

function sectionAfter(md, headingRe) {
  const match = headingRe.exec(md);
  if (!match) return "";
  const start = match.index + match[0].length;
  const rest = md.slice(start);
  const next = rest.search(/^\s*##\s+/m);
  return next >= 0 ? rest.slice(0, next) : rest;
}

export function extractGallery(body = "") {
  const section = sectionAfter(body, /^##\s+(?:9\s*页图文版|图文版|9-page[^\n]*)\s*$/mi);
  const urls = section ? imageUrls(section) : [];
  if (urls.length >= 2) return urls;
  return imageUrls(body).slice(1);
}

export function extractWords(body = "") {
  const section = sectionAfter(body, /^##\s+(?:词汇|Word Bank|Words)[^\n]*$/mi);
  if (!section) return [];
  const lines = section.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith("|"));
  if (lines.length < 2) return [];
  const cells = lines.map((line) => line.split("|").slice(1, -1).map((c) => c.trim()));
  const header = cells.shift().map((c) => c.toLowerCase());
  const isHeader = header.some((c) => /单词|word/.test(c));
  const rows = isHeader ? cells : [header, ...cells];
  return rows
    .filter((r) => r.length >= 2 && r[0] && !/^-+$/.test(r[0]))
    .map((r) => ({
      word: r[0].replace(/`/g, ""),
      ipa: (r[1] || "").replace(/`/g, ""),
      meaning: (r[2] || "").replace(/`/g, ""),
      collocation: (r[3] || "").replace(/`/g, "")
    }))
    .filter((w) => /[A-Za-z]/.test(w.word));
}

function excerptOf(body = "") {
  const text = stripHero(body)
    .replace(/^\s*#{1,6}\s+.*$/gm, " ")
    .replace(/^\s*!\[[^\]]*\]\([^)]*\)\s*$/gm, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*]\s+/gm, " ")
    .replace(/[#>*_`|]/g, " ")
    .replace(/\s+/g, " ");
  const parts = text.split(/(?<=[。！？.!?])\s+/).filter((s) => s.trim().length > 24);
  return (parts[0] || text).trim().slice(0, 118);
}

function readingTimeOf(meta = "", body = "") {
  const match = meta.match(/(\d+)\s*min/i);
  if (match) return Number(match[1]);
  const words = body.replace(/[#>*_`|\[\]()!-]/g, " ").split(/\s+/).filter((w) => /[A-Za-z]/.test(w)).length;
  return Math.max(4, Math.round(words / 170));
}

function sourceOf(meta = "") {
  const parts = meta.split("·").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || "Nautilus";
}

export function normalizeIssue(raw = {}) {
  const body = raw.body || "";
  const leading = parseLeadingMeta(body);
  const gallery = raw.gallery || extractGallery(body);
  const cover = raw.cover || gallery[0] || firstImage(body) || "./assets/img/issues/001/01-封面.png";
  const leadImage = raw.leadImage || firstImage(body) || cover;
  const topic = topicOf(raw.labels || []);
  const createdAt = raw.created_at || raw.createdAt || new Date().toISOString();
  const series = Number(raw.series || leading.series || raw.number || 1);
  return {
    id: String(raw.number || raw.id || 1),
    number: Number(raw.number || 1),
    series,
    title: raw.title || "Untitled",
    body,
    createdAt,
    updatedAt: raw.updated_at || raw.updatedAt || createdAt,
    htmlUrl: raw.html_url || raw.htmlUrl || "",
    labels: (raw.labels || []).map((l) => (typeof l === "string" ? l : l.name)).filter(Boolean),
    hook: raw.hook || leading.hook || "",
    meta: raw.meta || leading.meta || "",
    sourceUrl: raw.sourceUrl || leading.sourceUrl || "",
    cover,
    leadImage,
    images: raw.images || imageUrls(body),
    topic: topic.key,
    topicLabel: topic.label,
    readingTime: raw.readingTime || readingTimeOf(leading.meta, body),
    source: sourceOf(leading.meta),
    excerpt: raw.excerpt || excerptOf(body),
    gallery,
    words: raw.words || extractWords(body)
  };
}

async function fromFallback() {
  const res = await fetch("./data/issues.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Fallback content unavailable");
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(normalizeIssue);
}

export async function fetchIssues({ force = false } = {}) {
  const cached = Store.get("issues_cache", null);
  const fresh = cached && Date.now() - cached.at < CACHE_MS;
  if (!force && fresh) return cached.items;

  if (!CFG.owner || !CFG.repo) {
    const items = await fromFallback();
    Store.set("issues_cache", { at: Date.now(), items });
    return items;
  }

  const url = `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/issues?state=open&per_page=100&sort=created&direction=desc`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const raw = await res.json();
    const blocked = new Set(["draft", "hidden"]);
    const items = raw
      .filter((item) => !item.pull_request)
      .filter((item) => !(item.labels || []).some((l) => blocked.has(typeof l === "string" ? l : l.name)))
      .map(normalizeIssue)
      .filter((item) => item.body && item.title)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!items.length) throw new Error("No published issues");
    Store.set("issues_cache", { at: Date.now(), items });
    return items;
  } catch (err) {
    if (cached?.items?.length) return cached.items;
    try {
      const items = await fromFallback();
      Store.set("issues_cache", { at: Date.now(), items });
      return items;
    } catch {
      throw err;
    }
  }
}

export function renderMarkdown(md = "") {
  if (!window.marked || !window.DOMPurify) return "";
  const html = window.marked.parse(md, { gfm: true, breaks: false });
  return window.DOMPurify.sanitize(html, { ADD_ATTR: ["target", "rel"] });
}

export function articleHtml(issue) {
  let md = stripHero(issue.body);
  md = md.replace(/^\s*##\s+(?:9\s*页图文版|图文版|9-page[^\n]*)[\s\S]*$/mi, "");
  return renderMarkdown(md);
}

export function enhanceArticle(container, issue) {
  container.querySelectorAll("a").forEach((a) => {
    if (/^https?:/i.test(a.getAttribute("href") || "")) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
  });
  container.querySelectorAll("img").forEach((img) => {
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = img.alt || issue.title;
  });

  const toc = [];
  let index = 0;
  container.querySelectorAll("h2").forEach((h2) => {
    const text = h2.textContent.trim();
    if (!text || /9\s*页图文版/.test(text)) return;
    index += 1;
    h2.id = `section-${index}`;
    toc.push({ id: h2.id, text });
  });

  const wordHeading = [...container.querySelectorAll("h2")].find((h) => /词汇|Word Bank/i.test(h.textContent));
  if (wordHeading) {
    let table = wordHeading.nextElementSibling;
    while (table && table.tagName !== "TABLE") table = table.nextElementSibling;
    if (table) {
      table.classList.add("vocab-table");
      [...table.querySelectorAll("tbody tr")].forEach((tr) => {
        const td = tr.querySelector("td");
        if (!td || td.querySelector(".word-save")) return;
        const word = td.textContent.trim().replace(/`/g, "");
        if (!/[A-Za-z]/.test(word)) return;
        const cells = [...tr.querySelectorAll("td")].map((c) => c.textContent.trim().replace(/`/g, ""));
        const wrap = document.createElement("span");
        wrap.className = "word-cell";
        td.textContent = "";
        const label = document.createElement("span");
        label.textContent = word;
        const btn = document.createElement("button");
        btn.className = "word-save";
        btn.type = "button";
        btn.dataset.word = word;
        btn.dataset.ipa = cells[1] || "";
        btn.dataset.meaning = cells[2] || "";
        btn.dataset.collocation = cells[3] || "";
        btn.dataset.issue = String(issue.number);
        btn.dataset.issueTitle = issue.title;
        btn.setAttribute("aria-label", `收藏单词 ${word}`);
        btn.textContent = Store.isWordSaved(word) ? "✓" : "+";
        if (Store.isWordSaved(word)) btn.classList.add("saved");
        wrap.append(label, btn);
        td.append(wrap);
      });
    }
  }

  return toc;
}

export function getIssueParam() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("n")) return String(params.get("n"));
  const hash = window.location.hash.match(/^#issue-(\d+)$/);
  return hash ? hash[1] : "";
}

export function todayKey() {
  return dateKey();
}
