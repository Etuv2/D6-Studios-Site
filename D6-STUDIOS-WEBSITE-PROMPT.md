# D6 Studios website rebuild prompt

Rebuild this website from the ground up as the official D6 Studios website. Give the studio its own identity, project showcase, developer information, and Roblox community presence. Move the existing AT Dev personal portfolio into a dedicated section and restyle it to match D6 Studios while preserving its content, credits, project links, and artwork.

## Context and source material

- Website repository: `C:/Users/desti/Documents/WebDev/ATDevWebsite`.
- Existing public site: `http://d6studio.uk/`, hosted on Fasthosts Linux web hosting.
- Existing implementation: static HTML, CSS, and vanilla JavaScript; inspect `index.html`, `styles.css`, `script.js`, `README.md`, local instructions, and `Images/` before changing anything.
- ArcVerse codebase: `C:/Users/desti/Documents/GithubStuff/ArcVerse-Infinite-Battler`.
- ArcVerse artwork and design assets: `Z:/My Drive/Anime Card Game`.
- The two ArcVerse folders appear to represent the same project. Treat them as source and asset collections for one featured game, not two separate games.
- Visual reference: `https://endfield.gryphline.com/en-us`. Use its restrained industrial precision as a reference for composition and motion, with an original D6 identity.

Inspect project documentation and relevant artwork read-only. Copy only the assets needed by the website into its own asset directory. Keep private project documents, source code, credentials, caches, and development artifacts out of the public output.

## Verified branding and people

- Public brand name for this rebuild: **D6 Studios**.
- Roblox community: `https://www.roblox.com/communities/15184250/`; public community name: `D6: Studios`.
- Current community icon, retrieved for this brief: `briefing-assets/D6-Roblox-Community-Icon.png`. It contains a white angular triangular emblem and a historical `D6 GAMES` wordmark. Use it as the existing identity reference. Pair the recognizable emblem with the requested D6 Studios name; retain the original asset and do not stretch the small raster image into a large hero logo. Any clean vector adaptation must preserve the emblem's recognizable geometry.
- An older Drive asset is saved as `briefing-assets/D6-Studio-Logo.png`, from `https://drive.google.com/file/d/11rTqgjxMny1hpMnxRZplQMDOT3aPkCRa/view`. Visual inspection shows a mostly blank white canvas with a partial thin outline, so it is unsuitable as the finished logo without further clarification. Prefer the current community emblem.
- Existing portfolio identity: **Alexandru (Mihai) Tunaru**. Preserve the person's attribution and existing project credits. The AT logo belongs to this personal portfolio, not the studio identity.
- Public Roblox community metadata identifies **scotnoot**, user `366734688`, as community owner. The account `papajonhy1`, user `1435941628`, has the community role `Co-Owner`; its profile is already linked from the existing portfolio. These are verified Roblox account roles, not verified real-name mappings or creative job titles. Do not invent legal names, biographies, headshots, founder claims, programming/art responsibilities, or project contributions for these accounts.
- Recheck public information before publishing. Source endpoints used for this brief: `https://groups.roblox.com/v1/groups/15184250` and `https://groups.roblox.com/v2/users/1435941628/groups/roles`.

## Creative direction

Create a polished independent game studio website with a dark, precise, atmospheric visual identity. It should feel carefully art-directed and alive while keeping the games and people easy to understand.

Build the background from three coordinated layers:

1. **Live Damascus wave lines.** Create flowing, tightly spaced contour lines inspired by the layered grain of Damascus steel: elongated bands, soft folds, varying density, and slow coherent movement. Use fine silver and graphite tones with restrained highlights. The effect should read as a continuous material with depth. Avoid replacing this with a few sine waves, colorful liquid blobs, or a static wallpaper.
2. **Endfield-inspired fading grid lines.** Add thin orthogonal lines, occasional intersection details, and small groups of segments that softly appear, hold, and dissolve. Use a stable underlying grid with staggered fading. Keep the movement calm and avoid flashing, random flickering, or a constantly sweeping scanner. Let selected sections briefly reveal the grid as they enter view.
3. **Subtle quadtree structure.** Introduce sparse recursive square subdivisions, with occasional slow split/merge transitions and different cell sizes. This is a background composition detail, with controlled depth and density. Keep the structure spatially stable and quiet; it should reward attention without competing with text.

Compose these layers with broad, smooth dark gradients, soft masking, and deliberate negative space. Make waves strongest toward the edges and hero artwork area, the grid visible in selected regions, and the quadtree the quietest layer. Reduce their contrast beneath body copy. Do not give all three effects equal visual weight everywhere.

Use near-black, charcoal, graphite, off-white, and silver as the studio foundation. Derive any additional accent from the actual studio assets. Allow ArcVerse's pink/violet artwork to retain its own identity inside its project presentation. Keep gradients smooth and dimensional, with subtle dithering if needed to prevent banding.

Use a confident display typeface, highly readable body typography, disciplined spacing, thin dividers, and modest corner radii. Small monospace details are appropriate when they communicate real project information. Use expressive artwork and intentional composition instead of filling the page with identical rounded cards, floating glass panels, artificial statistics, terminal decorations, or generic startup copy.

## Site structure and visitor journey

Use clear navigation: **Studio, Projects, Team, Portfolio, Contact**, plus a recognizable Roblox community action.

- `/`: D6 Studios landing page. Establish the name, studio emblem, a concise description, atmospheric animated background, and two clear actions: explore projects and visit the Roblox community. Introduce ArcVerse early enough to be discovered without a long introductory scroll. Continue with the studio overview, featured work, people, and contact information.
- `/projects/arcverse/`: featured game detail page with authentic logo/artwork, concise description, platform, verified development status, selected screenshots, and supported developer credits. Give the visitor a useful overview before any deeper gallery content.
- `/portfolio/`: the existing personal portfolio, rebuilt in the D6 visual system and clearly attributed to Alexandru (Mihai) Tunaru. Preserve game development, web development, 3D modeling, biography, education, social links, and existing project information. Keep individual work and studio work clearly attributed. Include a visible return link to D6 Studios.

The navigation may link to sections on the landing page where dedicated pages are unnecessary. Use real URLs and native scrolling. Avoid scroll hijacking, mandatory intro sequences, splash screens, and ornamental loading delays.

## Projects, icons, and developers

Feature **ArcVerse: Infinite Battler**, confirmed by its repository README as a Roblox anime card battler. Derive further feature descriptions from relevant project documentation and verified current work. Do not present planned mechanics as released features.

Artwork sources include:

- `Z:/My Drive/Anime Card Game/Arcverse_Logo.png`.
- `Z:/My Drive/Anime Card Game/Headers/Header.png` and `Header_Glow.png`.
- `Z:/My Drive/Anime Card Game/Thumbnails/`.
- `C:/Users/desti/Documents/GithubStuff/ArcVerse-Infinite-Battler/art/logo-remaster-2026-10-12/13-vivid.png`, documented as the current logo review version. Inspect it alongside the original before selecting a web asset; a review version is not automatically an approved final logo.

Use the real studio mark, recognizable Roblox platform icon, actual project logos, and consistent interface icons. Give icon-only controls accessible names. Provide full game titles beside compact icons, preserve image aspect ratios, and ensure logos remain legible at small sizes. Avoid emoji substitutes.

Project presentations should expose title, short description, platform, verified status, relevant developer credits, and an honest next action. The public ArcVerse launch URL was not verified for this brief. Show a useful project-details action while that remains unresolved; only add an active Play on Roblox button when the correct public game URL is verified. Never use a guessed game ID or a placeholder link.

Include only confirmed studio projects. Preserve older games such as Interlinked Initiative, Temporal Entropy, and The Tower within the personal portfolio unless there is evidence of studio ownership. Do not inflate the studio catalogue with unrelated games from members' Roblox profiles.

For the team area, show verified names or account aliases, supported roles, relevant links, and authentic avatars or simple initials. Use the available information without inventing missing staff. Keep contact details visibly attributed: an existing personal email is a personal contact unless confirmed as the studio's contact. Do not add a contact form that cannot send messages.

## Motion, accessibility, and performance

The background is an essential part of the requested design. Implement it as a cohesive, efficient system, using Canvas or a small shader where justified. Keep controls and readable content in semantic HTML. Avoid thousands of animated DOM elements and unnecessary animation dependencies.

Use smooth, slow background motion, restrained section entrances, subtle image movement, and precise hover/focus feedback. Native scrolling should remain responsive. Keep pointer response slight and optional; do not require hover to discover important content.

Support `prefers-reduced-motion` with an attractive static composition and remove continuous/parallax movement. Provide a pause control for continuous animation. Pause rendering when the page is hidden, cap pixel density, and lower effect complexity on smaller devices. Prevent flashing, maintain text contrast, show keyboard focus, label controls, provide meaningful image alternatives, and make mobile navigation keyboard-accessible.

The first screen must display useful content immediately. Lazy-load offscreen artwork, reserve media dimensions, use suitable web image formats, and avoid layout shifts. Verify the design at real mobile and desktop viewport sizes.

## Implementation and deployment constraints

Preserve an untouched reference of the original portfolio before replacing its structure. Keep all source files UTF-8 without BOM, with plain ASCII punctuation unless content explicitly requires otherwise.

Use the smallest maintainable implementation that achieves this design. The site must deploy as ordinary static files to Fasthosts; it must not require a persistent Node server, database, or runtime API secret. A local build tool is acceptable only when it provides a concrete benefit and produces a complete static output. Compile any styling dependencies locally instead of relying on a development-only runtime CDN.

Ensure direct visits and refreshes work for `/portfolio/` and `/projects/arcverse/` on static hosting. Directory `index.html` pages are suitable; do not assume an SPA rewrite is configured. Fix relocated portfolio image paths, social metadata, and internal navigation. Preserve useful old fragment links where practical, and provide a clear route to the migrated portfolio when an old homepage section no longer exists.

Use D6-specific page titles, descriptions, favicon, and social previews. Remove the old placeholder canonical domain. Configure canonical metadata against the actual production origin; verify HTTPS before selecting an HTTPS canonical or adding redirects. SSL was not configured during the earlier FTP deployment.

Before publishing, inspect existing remote files, preserve rollback material, and upload only the intended public output to the website's HTDOCS directory. Keep briefs, archives, source-only assets, and unrelated files out of the upload. Verify the live pages and media after deployment. This prompt describes the future rebuild; publication should follow the authorization in the implementation session.

## Delivery and acceptance

First inspect the sources, inventory usable assets and content, and state any remaining important uncertainty. The owner has already chosen to restyle the portfolio to match D6 Studios and authorized using verified assets and information you find. Proceed on those decisions without asking them again. Ask only about missing information that would materially change the implementation; omit unsupported claims and unavailable actions while independent work continues.

Deliver the complete working website, the restyled separate portfolio, a static deployment package, and concise run/build/deploy instructions. Validate direct page loads, project navigation, mobile menu behavior, keyboard operation, reduced motion, animation pause, media loading, and browser console errors. Inspect actual rendered pages at mobile and desktop sizes, including a WebGL-unavailable fallback if shaders are used. Report the checks performed and any remaining limitation accurately.

The finished result should immediately communicate D6 Studios, make ArcVerse easy to discover, give the studio a recognizable animated Damascus/grid/quadtree identity, and preserve the personal portfolio as a clearly attributed part of the new site.
