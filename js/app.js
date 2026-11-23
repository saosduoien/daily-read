import { Store } from "./store.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

let toastTimer = null;
export function toast(message, ms = 2400) {
  const node = $("#toast");
  if (!node) return;
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), ms);
}

export async function copyText(text, message = "已复制") {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.append(area);
    area.select();
    try { document.execCommand("copy"); toast(message); return true; }
    catch { toast("复制失败，请手动选择"); return false; }
    finally { area.remove(); }
  }
}

export function openModal(innerHtml) {
  const modal = $("#modal");
  if (!modal) return;
  const inner = $(".modal-inner", modal);
  inner.innerHTML = `<button class="modal-close" type="button" aria-label="关闭">×</button>${innerHtml}`;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  $(".modal-close", modal)?.addEventListener("click", closeModal);
}

export function closeModal() {
  const modal = $("#modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "night" ? "night" : "paper";
  $$("[data-theme-label]").forEach((el) => {
    el.textContent = theme === "night" ? "Day reading" : "Night reading";
  });
  $$("[data-theme-toggle]").forEach((btn) => {
    btn.setAttribute("aria-label", theme === "night" ? "切换到日间阅读" : "切换到夜间阅读");
  });
}

function initTheme() {
  applyTheme(Store.getTheme());
  $$("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "night" ? "paper" : "night";
      Store.setTheme(next);
      applyTheme(next);
    });
  });
}

function initDate() {
  const now = new Date();
  const long = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "short", day: "numeric"
  }).format(now).toUpperCase();
  const short = new Intl.DateTimeFormat("en-CA").format(now);
  $$("[data-today]").forEach((el) => { el.textContent = long; });
  $$("[data-date]").forEach((el) => { el.textContent = short.replaceAll("-", "."); });
  $$("[data-year]").forEach((el) => { el.textContent = String(now.getFullYear()); });
}

function renderStreak() {
  const streak = Store.streak();
  $$("[data-streak]").forEach((el) => { el.textContent = String(streak); });
  const dots = Store.last14();
  $$("[data-dots]").forEach((box) => {
    box.innerHTML = dots.map((d) => `<span class="dot${d.on ? " on" : ""}${d.today ? " today" : ""}" title="${d.key}"></span>`).join("");
  });
  const stats = Store.stats();
  $$("[data-read-count]").forEach((el) => { el.textContent = String(stats.read); });
  $$("[data-word-count]").forEach((el) => { el.textContent = String(stats.words); });
  const due = Store.dueWords().length;
  $$("[data-due-count]").forEach((el) => { el.textContent = String(due); });
  $$("[data-due-badge]").forEach((el) => {
    el.textContent = due ? String(due) : "";
    el.classList.toggle("hidden", !due);
  });
}

function initNav() {
  const page = document.body.dataset.page || "home";
  $$("[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === page);
    if (link.dataset.nav === page) link.setAttribute("aria-current", "page");
  });
}

let deferredPrompt = null;
function initInstall() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    $$("[data-install]").forEach((btn) => { btn.disabled = false; });
  });

  $$("[data-install]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice.catch(() => {});
        deferredPrompt = null;
        return;
      }
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIOS) {
        openModal(`
          <div style="background:var(--paper);color:var(--ink);padding:26px 22px;max-width:320px">
            <div class="eyebrow">INSTALL ON IPHONE</div>
            <h3 style="font:500 28px/1.1 var(--serif);margin:12px 0 8px">把阅读台放到桌面</h3>
            <p style="font:400 14px/1.7 var(--sans);color:var(--muted);margin:0">在 Safari 中点击底部的“分享”按钮，再选择“添加到主屏幕”。之后可以像 App 一样打开，并离线阅读最近几期。</p>
          </div>`);
      } else {
        toast("浏览器暂未提供安装入口；可先收藏网址，或从浏览器菜单“添加到主屏幕”。", 3600);
      }
    });
  });
}

function initModal() {
  const modal = $("#modal");
  if (!modal) return;
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

export function initShell() {
  initTheme();
  initDate();
  initNav();
  initInstall();
  initModal();
  renderStreak();
  window.addEventListener("dr:updated", renderStreak);
  window.addEventListener("storage", renderStreak);
}

export function formatNumber(n) {
  return new Intl.NumberFormat("en-US").format(Number(n) || 0);
}

export function readingTimeText(minutes) {
  return `${minutes || 0} min`;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initShell, { once: true });
} else {
  initShell();
}
