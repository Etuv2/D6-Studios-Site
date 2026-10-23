# D6 Studios website

Static website for D6 Studios (http://d6studio.uk/): studio landing page, the ArcVerse: Infinite Battler project page, and a directory of members' personal portfolios.

## Layout

```
site/                        public output; upload the contents of this folder only
  index.html                 landing page: hero, Studio, Projects, Team, Portfolio, Contact
  projects/arcverse/         ArcVerse: Infinite Battler project page
  portfolio/                 portfolio directory (list of member portfolios)
  portfolio/alexandru-tunaru/  Alexandru (Mihai) Tunaru's portfolio (moved from the old homepage)
  assets/css/d6.css          the whole design system, plain CSS
  assets/js/background.js    animated background: WebGL Damascus lines + Canvas 2D grid and quadtree
  assets/js/site.js          header, mobile menu, in-site navigation, entrances, typewriter/number effects, section focus
  assets/fonts/              self-hosted Saira Condensed, Inter, JetBrains Mono (woff2)
  assets/img/                WebP artwork, team avatars, social preview images
dist/d6studios-site.zip        the contents of site/ zipped for upload
briefing-assets/               source material from the brief (not deployed)
D6-STUDIOS-WEBSITE-PROMPT.md   the original rebuild brief (not deployed)
```

There is no build step and no runtime dependency. Every page is a directory `index.html`, so `/portfolio/`, `/portfolio/alexandru-tunaru/` and `/projects/arcverse/` work on direct visits without rewrite rules.

The landing page sections and ArcVerse page sections (`.section.screen`) each fill one screen below the header with their content centred, so navigation jumps frame a whole section. They were checked to fit at 1920x1080, 1536x730, 1366x657, 1280x800, 1024x768 and 1024x700; on phones they grow with their content.

When you change `d6.css`, `background.js` or `site.js`, bump the `?v=` value on its link in all four `index.html` files, so browsers fetch the new file instead of a cached copy.

## Adding a member portfolio

1. Copy `site/portfolio/alexandru-tunaru/` to `site/portfolio/<name>/` and replace its content, title, description and canonical URL.
2. Add a row to the `.roster` list in both `site/index.html` (Portfolio section) and `site/portfolio/index.html`: number, avatar, name, studio role, disciplines and link.

## Run locally

```bash
python -m http.server 8642 --bind 127.0.0.1 --directory site
```

Open http://127.0.0.1:8642/. Use a server rather than opening files directly, because the pages use root-relative paths (`/assets/...`).

## Background

- Damascus layer: a fragment shader draws contour lines of a slowly moving field. If WebGL is unavailable, the same field is drawn with Canvas 2D at a lighter density.
- Grid and quadtree: Canvas 2D, drawn on top. Sections marked `data-grid-reveal` briefly light the grid when they scroll into view.
- The animation runs continuously (owner decision, including when the OS asks for reduced motion). Under reduced motion, pointer response and section entrances are turned off. The square button at the bottom right pauses and resumes the animation, and the choice is remembered. Rendering stops while the tab is hidden.

## In-site navigation

Links between the site's own pages don't trigger a full reload. `site.js` fetches the next page, swaps in its `<main>`, and updates the title, meta tags, URL and active nav link, with a short fade. The animated background keeps running and the screen never goes blank or white between pages. Back/forward, direct visits and refreshes still load the real `index.html` files, so static hosting needs no extra setup. If a fetch fails, the link falls back to a normal page load. External links, new-tab clicks and file links are left alone.

## Motion

- Labels and section headings decode in with a typewriter effect; section numbers, the portfolio list numbers and portfolio dates roll in like counters. Untyped characters are only transparent, so screen readers always get the full text.
- Section headings and their rules replay each time you come back to a section. Artwork wipes open as it enters. On desktop, the section in view stays in focus while its neighbours recede.
- Under reduced motion, text, entrances and focus effects are shown in their final state; only the background keeps moving (owner decision).

## Deploy (Fasthosts, FTP)

1. Download a backup of the current remote HTDOCS contents first, so the old site can be restored if needed.
2. Upload the contents of `site/` (not the folder itself) to HTDOCS, or extract `dist/d6studios-site.zip` there. Keep the folder structure.
3. Delete the old `styles.css`, `script.js` and `Images/` from HTDOCS only once the new pages load correctly.
4. Check http://d6studio.uk/, /projects/arcverse/, /portfolio/, /portfolio/alexandru-tunaru/ and an old link such as http://d6studio.uk/#about, which should redirect to /portfolio/alexandru-tunaru/#about.

Do not upload `briefing-assets/`, `dist/`, the brief or this README.

Canonical URLs use `http://d6studio.uk/` because HTTPS currently serves an untrusted certificate. After SSL is set up in Fasthosts, change the `canonical` and `og:` URLs in the four `index.html` files to `https://`.

## Content sources

- ArcVerse logo: `art/logo-remaster-2026-10-12/13-vivid.png` from the ArcVerse repository.
- Key art: the three Roblox thumbnails from `Z:/My Drive/Anime Card Game/Thumbnails/`, cropped above the old logo baked into each image.
- Game modes: `GameModeDefinitions.luau` and `GameModeAvailability.luau` (the hidden Draft modes are left out).
- Team roles: the D6: Studios Roblox group (https://www.roblox.com/share/g/15184250) and the owner. Studio contact: d6gamesstudio@gmail.com.
- When ArcVerse launches, add its Roblox game link to `projects/arcverse/index.html` and to the Projects section of `index.html`.
