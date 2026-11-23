import { fetchIssues } from "./github.js";
import { $, copyText, toast } from "./app.js";

const CFG = window.DR_CONFIG || {};

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildTemplate() {
  const date = localDate();
  const n = CFG.nextIssue?.number || "002";
  return `> 一句中文钩子：这篇文章为什么值得读？
> ${date} · ${n} · 8 min · Nautilus
> https://原文链接

![封面](PASTE_COVER_URL)

## 为什么读这篇

用 2–3 句话说明：这篇文章解决什么问题？为什么现在值得读？

- **一个判断**：……
- **一组词**：……
- **一条可迁移的论证链**：……

## 原文精读 01

> 原文段落，建议 60–90 词。

**参考译文**

……

**词与句**

- \`word\` /ipa/ 词性 + 释义
- \`word\` /ipa/ 词性 + 释义

## 原文精读 02

> 原文段落，建议 60–90 词。

**参考译文**

……

## 长难句

> 一句 30–45 词的长句。

| 意群 | 结构 | 解释 |
|---|---|---|
| ① ... | 主语 + 后置定语 | ... |
| ② ... | 谓语 + 插入语 | ... |
| ③ ... | 同位语 | ... |

## 词汇

| 单词 | 音标 | 释义 | 搭配 |
|---|---|---|---|
| word | /wɜːd/ | n. 释义 | a useful word |
| word | /wɜːd/ | v. 释义 | word it carefully |

## 论证地图

1. **THE HOOK / 现象**：……
2. **THE MECHANISM / 机制**：……
3. **THE COST / 代价**：……
4. **THE REMEDY / 对策**：……

## 今日复盘

- **Takeaway 1.** ……
- **Takeaway 2.** ……
- **Takeaway 3.** ……

**今天的小任务**：……

## 9 页图文版

![01 封面](PASTE_PAGE_01_URL)
![02 文章来源](PASTE_PAGE_02_URL)
![03 文章原图](PASTE_PAGE_03_URL)
![04 精读 01](PASTE_PAGE_04_URL)
![05 精读 02](PASTE_PAGE_05_URL)
![06 长难句](PASTE_PAGE_06_URL)
![07 词汇卡](PASTE_PAGE_07_URL)
![08 论证地图](PASTE_PAGE_08_URL)
![09 复盘](PASTE_PAGE_09_URL)`;
}

function init() {
  const template = buildTemplate();
  const pre = $("#template");
  if (pre) pre.textContent = template;

  const repoUrl = CFG.repoUrl || `https://github.com/${CFG.owner}/${CFG.repo}`;
  const repoLink = $("#repoLink");
  if (repoLink) repoLink.href = repoUrl;

  const title = "New issue title";
  const newUrl = `${repoUrl}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(template)}`;
  const newIssue = $("#newIssue");
  if (newIssue) newIssue.href = newUrl;

  $("#copyTemplate")?.addEventListener("click", () => copyText(template, "模板已复制，去 GitHub 新建 issue 粘贴。"));
  $("#copyTemplate")?.addEventListener("dblclick", () => toast("双击也复制了。", 1200));

  fetchIssues()
    .then((issues) => {
      const status = $("#repoStatus");
      if (status) status.textContent = `CONNECTED · ${issues.length} ISSUE${issues.length === 1 ? "" : "S"}`;
    })
    .catch(() => {
      const status = $("#repoStatus");
      if (status) status.textContent = "LOCAL PREVIEW";
    });
}

init();
