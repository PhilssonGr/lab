/* Site constants. origin is the canonical base.
   To switch to https://buildsparkai.com, change origin and run:
   node scripts/generate-site.js
   The script rewrites canonical and social URLs, sitemap.xml, robots.txt,
   llms.txt, the markdown cards, and the track and pack pages. */
var BF_SITE = {
  origin: "https://bf-lab.netlify.app",
  name: "BuildSpark AI",
  email: "support@buildsparkai.com",
  tracks: [
    {
      slug: "foundations",
      name: "Foundations",
      summary: "How models read text, how much fits in one request, and how you state the task.",
      pack: "Practice beside the Foundations cards. Each set is one worked example, one checklist, and one change in a prompt or repo you already have. The first three sets are a token budget, a context layout, and a prompt rewrite, next to Tokens, Context Window, and Prompting. The other concepts on this track do not have a practice set yet."
    },
    {
      slug: "retrieval",
      name: "Retrieval & Grounding",
      summary: "How a product finds source text and keeps an answer tied to it.",
      pack: "Practice for splitting documents, searching them, and checking that a reply stays on the retrieved text. Each concept is planned as one worked example, one checklist, and one change in a prompt or repo you already have. No set in this pack is written yet."
    },
    {
      slug: "agents",
      name: "Agents",
      summary: "How a model asks for tools, loops on the result, and when a person still decides.",
      pack: "Practice for tool calling, the agent loop, permissions, and the ways a loop fails. Each concept is planned as one worked example, one checklist, and one change in a prompt or repo you already have. No set in this pack is written yet."
    },
    {
      slug: "ship",
      name: "Ship & Maintain",
      summary: "How a workflow is evaluated, watched, and kept within cost and privacy limits after it ships.",
      pack: "Practice for evaluation, cost, latency, privacy, and what the product does when a model errors. Each concept is planned as one worked example, one checklist, and one change in a prompt or repo you already have. No set in this pack is written yet."
    }
  ]
};
