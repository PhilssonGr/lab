# Blacklion Foundry — Concepts

The site is the concepts product: a practical map and cards for builders who already use AI.

Account: philssongroup@outlook.com
No IRL Rugby. No RR data.

Live: https://bf-lab.netlify.app

Static HTML, CSS, and JS. No backend. Pages load `concepts.css` and `concepts.js`.

## Card model

Each concept card has four parts:

1. What it is — short text and a plain interactive.
2. Why it matters — three lines: Cost, Quality, Risk.
3. How to apply it — one thing to try today, and one common mistake.
4. Related concepts — links to cards that exist. Temperature, Embeddings, RAG, Evaluation, and Agents are listed as coming soon, not links.

A card also shows its track and depth tabs (Glance, Practice, Deep). Tokens, Context Window, and Prompting are Foundations. Glance is filled. Practice and Deep are marked coming soon.

## Pages

- `index.html` — home: positioning, Next for you, three cards, map stub, Ask box, apply-pack waitlist.
- `tokens.html`, `context-window.html`, `prompting.html` — the three cards.
- `map.html` — tracks: Foundations, Retrieval & Grounding, Agents, Ship & Maintain. Opened cards are stored in `localStorage` under `bf-concepts-opened`.
- `ask.html` — keyword match in the browser. No model and no backend.
- `apply.html` — apply packs, with a disabled waitlist button. No form.
- `concepts.css`, `concepts.js` — theme and shared behavior.
- `_redirects` — `/concepts` and `/concepts/*` permanently redirect to the same pages at the site root.

`tools.html`, `learn.html`, `status.html`, and `about.html` stay on the server. They are not linked from the main nav.
