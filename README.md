# Blacklion Foundry — lab

Studio, not a vertical.
Account: philssongroup@outlook.com
No IRL Rugby. No RR data.

Status: repo exists. Cursor SMS pending.

## Concepts

`/concepts` is a static section for builders who already use AI: a practical map and cards. It does not restyle the lab pages. Concept pages load `concepts/concepts.css` and `concepts/concepts.js` only.

### Card model

Each concept card has four parts:

1. What it is — short text and a plain interactive.
2. Why it matters — three lines: Cost, Quality, Risk.
3. How to apply it — one thing to try today, and one common mistake.
4. Related concepts — links to cards that exist. Temperature, Embeddings, RAG, Evaluation, and Agents are listed as coming soon, not links.

A card also shows its track and depth tabs (Glance, Practice, Deep). Tokens, Context Window, and Prompting are Foundations. Glance is filled. Practice and Deep are marked coming soon.

### File layout

- `concepts/index.html` — home: positioning, three cards, map stub, Ask box, apply-pack waitlist.
- `concepts/tokens.html`, `concepts/context-window.html`, `concepts/prompting.html` — the three cards.
- `concepts/map.html` — tracks: Foundations, Retrieval & Grounding, Agents, Ship & Maintain.
- `concepts/ask.html` — keyword match in the browser. No model and no backend.
- `concepts/apply.html` — apply packs, with a disabled waitlist button. No form.
- `concepts/concepts.css`, `concepts/concepts.js` — theme and shared behavior.
