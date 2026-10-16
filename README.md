# BuildSpark AI — Concepts

The site is a practical map and cards for builders who already use AI.

Live: https://bf-lab.netlify.app

The canonical origin is `BF_SITE.origin` in `site.js`. To point the site at https://buildsparkai.com later, change that value and run `node scripts/generate-site.js`.

Static HTML, CSS, and JS. No backend and no build step for the pages. Pages load `concepts.css`. Pages that read the registry also load `site.js`, `concepts-data.js`, and `concepts.js`.

## Registry

`concepts-data.js` is the curriculum. Each concept has an id, title, track, prerequisites, status (`live` or `coming-soon`), access (`free`, `pack`, or `all-access`), a one-line summary, and `lastChecked`. `lastChecked` is null until a card exists.

Concept cards are `free`. `pack` and `all-access` are reserved for future practice items, which are not in the registry yet.

Tracks: Foundations, Retrieval & Grounding, Agents, Ship & Maintain.

Only Tokens, Context Window, and Prompting are live. Coming soon concepts are not links.

Related concepts on a card are the concepts that list it as a prerequisite. The map draws an arrow along each prerequisite link.

## Card model

Each live card uses the v2 template:

1. A short quotable definition, then Glance, Practice, and Deep. Glance is filled. Practice and Deep are marked coming soon.
2. What it is, with a plain interactive.
3. Why it matters: Cost, Quality, and Risk.
4. How to apply: one thing to try today.
5. A separate common-mistake block.
6. A self-check question.
7. Sources. Pending until a claim cites a provider doc.
8. Prerequisites and related concepts, filled from the registry.
9. Last checked date and a What changed note.
10. A visible question section. The same questions are in the page's JSON-LD.

The core of a live card is in the HTML. JavaScript fills the summary, the access label, the last-checked date, and the prerequisite and related lists from the registry.

Opened live cards are stored in this browser under `localStorage` key `bf-concepts-opened`.

## Pages

- `index.html` — home, Next for you, the live cards, and the track list.
- `tokens.html`, `context-window.html`, `prompting.html` — the three live cards. Plain-text copies are `tokens.md`, `context-window.md`, and `prompting.md`.
- `map.html` — the four tracks. Coming soon names are not links.
- `tracks/*.html` — one page per track, listing that track's concepts from the registry.
- `ask.html` — keyword match in the browser. No model and no backend.
- `pricing.html` — Free, track pack (€39 once), all-access (€15/month or €129/year), and teams (€12/seat/month, minimum 5). No checkout.
- `packs/*.html` — what each track pack will contain. Marked coming soon.
- `apply.html` — the four packs and the planned Foundations sets. The waitlist is a mailto link, not a form.
- `about.html` — what BuildSpark AI is, who it is for, how cards stay current, and support@buildsparkai.com.
- `llms.txt` — purpose of the site and every live concept, with a one-line summary and URL.
- `sitemap.xml`, `robots.txt` — written by `scripts/generate-site.js`. Robots allows AI crawlers.
- `concepts-data.js` — the concept registry.
- `concepts.css`, `concepts.js`, `site.js` — theme, shared behavior, and the canonical origin.

Founding members are about 30% off a paid tier. That request goes through the same waitlist email. Nothing on the site takes payment.

`/tools`, `/learn`, and `/status` redirect to `/`. `/about` is the current About page.
