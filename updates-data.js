/* Updates log. Plain script, no build. Loaded before concepts.js.
   Each entry is a change that already shipped: date, title, concept ids, one line.
   Home, the map, and /changelog read this list. Do not add a line for a change
   that is not on the site yet. */
var BF_UPDATES = [
  {
    date: "2026-10-16",
    title: "Tokens and Context Window cost notes",
    concepts: ["tokens", "context-window"],
    line: "Cost on Tokens covers output versus input, cached input, and a higher rate past a size threshold. Cost on Context Window notes that resending the same history or documents adds up, and that prompt caching can make the repeated part cheaper."
  },
  {
    date: "2026-10-16",
    title: "Card template v2",
    concepts: ["tokens", "context-window", "prompting"],
    line: "Live cards use the v2 layout. Prerequisites and related concepts come from the registry."
  },
  {
    date: "2026-10-16",
    title: "Concepts site at the root",
    concepts: [],
    line: "The concepts product is the site root."
  }
];
