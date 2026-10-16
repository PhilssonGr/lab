# Blacklion Foundry — Concepts

The site is the concepts product: a practical map and cards for builders who already use AI.

Live: https://bf-lab.netlify.app

Static HTML, CSS, and JS. No backend and no build step. Pages load `concepts.css`, `concepts-data.js`, and `concepts.js`.

## Registry

`concepts-data.js` is the curriculum. Each concept has an id, title, track, prerequisites, status (`live` or `coming-soon`), a one-line summary, and `lastChecked`. `lastChecked` is null until a card exists.

Tracks: Foundations, Retrieval & Grounding, Agents, Ship & Maintain.

Only Tokens, Context Window, and Prompting are live. Coming soon concepts are not links.

Related concepts on a card are the concepts that list it as a prerequisite. The map draws an arrow along each prerequisite link.

## Card model

Each live card uses the v2 template:

1. Glance, Practice, and Deep. Glance is filled. Practice and Deep are marked coming soon.
2. What it is, with a plain interactive.
3. Why it matters: Cost, Quality, and Risk.
4. How to apply: one thing to try today.
5. A separate common-mistake block.
6. A self-check question.
7. Sources. Pending until a claim cites a provider doc.
8. Prerequisites and related concepts, filled from the registry.
9. Last checked date and a What changed note.

Opened live cards are stored in this browser under `localStorage` key `bf-concepts-opened`.

## Pages

- `index.html` — home, Next for you, the live cards, and the track list.
- `tokens.html`, `context-window.html`, `prompting.html` — the three live cards.
- `map.html` — the four tracks. Coming soon names are not links.
- `ask.html` — keyword match in the browser. No model and no backend.
- `apply.html` — apply packs, with a disabled waitlist button. No form.
- `concepts-data.js` — the concept registry.
- `concepts.css`, `concepts.js` — theme and shared behavior.
- `_redirects` — `/concepts` and `/concepts/*` permanently redirect to the same pages at the site root.

`tools.html`, `learn.html`, `status.html`, and `about.html` stay on the server. They are not linked from the main nav.
