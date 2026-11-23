# THE DAILY READ / 每日精读

A personal daily English reading desk. 第一期：Michael Pollan, *Boredom Is Not Empty.*

## What this is

A static reading platform hosted on GitHub Pages:

- **Today** — latest issue, reading progress, streak, recent issues.
- **Reader** — web edition + 9-page visual edition, vocabulary save, long-sentence notes.
- **Archive** — search and browse every issue.
- **Wordbook** — saved words with spaced review.
- **Studio** — publish a new issue from a phone via GitHub Issues.
- **PWA** — installable, offline cache for the app shell and recent pages.

Reading progress, streak, and wordbook are stored **only in the browser** (`localStorage`). The public repo only contains published issues.

## Content source

New issues are GitHub Issues in this repository. The site fetches:

```
https://api.github.com/repos/saosduoien/daily-read/issues?state=open&per_page=100
```

An open issue is published automatically. Add a `draft` label to hide it. No rebuild or deploy is needed after publishing.

### Issue format

The first two blockquote lines are the hero:

```md
> 你的无聊，正在被算法偷走。
> 2026-11-23 · 001 · 8 min · Nautilus
```

- First image = lead image.
- `## 9 页图文版` = carousel images.
- `## 词汇` table = words with a `+` save button.
- `## ...` headings = reader table of contents.

See `studio.html` for a copyable template.

## Local preview

```powershell
cd "D:\比赛\daily-read"
python -m http.server 4173
```

Open http://127.0.0.1:4173/

## Files

```
index.html             Today / dashboard
issue.html             Reader
archive.html           Archive
wordbook.html          Personal wordbook
studio.html            Publish guide + template
css/app.css            Visual system
js/github.js           GitHub Issues API + Markdown parsing
js/store.js            localStorage: progress, streak, words
js/issue.js            Reader behavior
sw.js                  PWA cache
data/issues.json       Offline / local fallback for issue 001
assets/                Fonts, icons, issue images
```

## Deploy

GitHub Pages, branch `main`, root `/`. The site is fully static; no build step.

---

*THE DAILY READ · for one reader*
