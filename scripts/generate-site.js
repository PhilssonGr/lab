/* Builds discoverability files from site.js and concepts-data.js.
   Run from the repo root: node scripts/generate-site.js
   Change BF_SITE.origin in site.js, then run this again, to move the
   canonical host (for example to https://buildsparkai.com). */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");

function load(file) {
  var context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  return context;
}

var site = load("site.js").BF_SITE;
var concepts = load("concepts-data.js").BF_CONCEPTS;
var updates = load("updates-data.js").BF_UPDATES;

if (!site || !site.origin || !site.tracks) throw new Error("site.js did not set BF_SITE");
if (!concepts || concepts.length !== 48) throw new Error("Expected 48 concepts, got " + (concepts ? concepts.length : 0));
validateUpdates(updates, concepts);

var ACCESS = { free: "Free card", pack: "Pack", "all-access": "All-access" };
concepts.forEach(function (concept) {
  if (!ACCESS[concept.access]) throw new Error(concept.id + " has access " + concept.access);
  if (!concept.summary || !concept.track || !concept.id || !concept.title) throw new Error(concept.id + " is incomplete");
});

var ICONS = [
  '<link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml" />',
  '<link rel="icon" href="/assets/brand/favicon-32.png" type="image/png" sizes="32x32" />',
  '<link rel="icon" href="/assets/brand/favicon-16.png" type="image/png" sizes="16x16" />',
  '<link rel="shortcut icon" href="/assets/brand/favicon.ico" />',
  '<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png" sizes="180x180" />',
  '<link rel="manifest" href="/assets/brand/site.webmanifest" />'
].join("\n  ");

var LOGO = '<a class="brand" href="/"><img src="/assets/brand/logo.svg" alt="BuildSpark AI" width="519" height="100" /></a>';

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function abs(urlPath) {
  if (urlPath === "/") return site.origin + "/";
  return site.origin + urlPath;
}

function stripTags(value) {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function mustMatch(html, regex, label) {
  var match = html.match(regex);
  if (!match) throw new Error("Missing " + label);
  return stripTags(match[1]);
}

function waitlist(tier, track) {
  return "mailto:" + site.email + "?subject=" + encodeURIComponent("Waitlist: " + tier + " - " + track);
}

function nav(current) {
  var items = [
    ["/map", "Map"],
    ["/ask", "Ask"],
    ["/apply", "Apply"],
    ["/pricing", "Pricing"]
  ];
  return items.map(function (item) {
    var currentAttr = item[0] === current ? ' aria-current="page"' : "";
    return '        <a href="' + item[0] + '"' + currentAttr + ">" + item[1] + "</a>";
  }).join("\n");
}

function footer() {
  return [
    '    <footer class="foot">',
    '      <a href="/">Home</a> · <a href="/map">Map</a> · <a href="/changelog">Changelog</a> · <a href="/pricing">Pricing</a> · <a href="/about">About</a>',
    "    </footer>"
  ].join("\n");
}

function seoTags(page) {
  var url = abs(page.path);
  var title = page.title;
  var description = page.description;
  var type = page.type || "website";
  var tags = [];
  if (page.noindex) tags.push('<meta name="robots" content="noindex" />');
  tags.push('<link rel="canonical" href="' + url + '" />');
  tags.push(
    '<meta property="og:type" content="' + type + '" />',
    '<meta property="og:site_name" content="' + esc(site.name) + '" />',
    '<meta property="og:title" content="' + esc(title) + '" />',
    '<meta property="og:description" content="' + esc(description) + '" />',
    '<meta property="og:url" content="' + url + '" />',
    '<meta property="og:image" content="' + site.origin + '/assets/brand/icon-512.png" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:title" content="' + esc(title) + '" />',
    '<meta name="twitter:description" content="' + esc(description) + '" />',
    '<meta name="twitter:image" content="' + site.origin + '/assets/brand/icon-512.png" />'
  );
  return tags.map(function (tag) { return "  " + tag; }).join("\n");
}

function pageShell(page, body) {
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    "  " + ICONS,
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '  <meta name="theme-color" content="#0c0b0a" />',
    "  <title>" + esc(page.title) + "</title>",
    '  <meta name="description" content="' + esc(page.description) + '" />',
    seoTags(page),
    '  <link rel="stylesheet" href="/concepts.css" />',
    "</head>",
    '<body class="concepts">',
    '  <a class="skip" href="#content">Skip to content</a>',
    '  <div class="wrap">',
    '    <header class="top">',
    "      " + LOGO,
    '      <nav class="nav" aria-label="Concepts">',
    nav(page.nav || ""),
    "      </nav>",
    "    </header>",
    '    <main id="content" class="prose-links" tabindex="-1">',
    body,
    "    </main>",
    footer(),
    "  </div>",
    "</body>",
    "</html>",
    ""
  ].join("\n");
}

function inTrack(name) {
  return concepts.filter(function (concept) { return concept.track === name; });
}

function conceptItem(concept) {
  var access = ACCESS[concept.access];
  var status = concept.status === "live" ? "Live" : "Coming soon";
  var name = concept.status === "live"
    ? '<a href="/' + concept.id + '">' + esc(concept.title) + "</a>"
    : '<span class="name">' + esc(concept.title) + "</span>";
  return [
    '      <li id="' + esc(concept.id) + '">',
    "        " + name,
    '        <span class="pill">' + status + "</span>",
    '        <span class="pill">' + access + "</span>",
    "        <p>" + esc(concept.summary) + "</p>",
    "      </li>"
  ].join("\n");
}

function liveSentence(list) {
  var n = list.filter(function (concept) { return concept.status === "live"; }).length;
  var words = ["No", "One", "Two", "Three", "Four", "Five", "Six"];
  if (n === 0) return "No cards on this track are live yet.";
  if (n === 1) return "One card on this track is live.";
  return (words[n] || String(n)) + " cards on this track are live.";
}

function trackDescription(track, list) {
  return track.name + " on BuildSpark AI. " + track.summary + " " + list.length + " concepts. Cards are free. The practice pack is coming soon.";
}

function packDescription(track) {
  return "The " + track.name + " pack is €39 once, for practice beside the free " + track.name + " cards. Coming soon. No checkout on BuildSpark AI.";
}

function trackBody(track, list) {
  return [
    '      <p class="crumb"><a href="/map">Map</a> · ' + esc(track.name) + "</p>",
    '      <p class="kicker">Track</p>',
    "      <h1>" + esc(track.name) + "</h1>",
    '      <p class="lede">' + esc(track.summary) + "</p>",
    "      <p>" + liveSentence(list) + " Concept cards are free, including the ones that are not written yet. Names without a card are not links. Practice for this track is the <a href=\"/packs/" + track.slug + "\">" + esc(track.name) + " pack</a>, and that pack is coming soon.</p>",
    '      <ul class="concept-index">',
    list.map(conceptItem).join("\n"),
    "      </ul>",
    '      <p class="cta-row"><a class="button" href="/packs/' + track.slug + '">' + esc(track.name) + ' pack</a> <a class="button ghost" href="/pricing">Pricing</a></p>'
  ].join("\n");
}

function packBody(track, list) {
  var sets = "";
  if (track.slug === "foundations") {
    sets = [
      "      <h2>Planned sets</h2>",
      "      <ul class=\"pack-list\">",
      "        <li><strong>Token budget</strong> See what a prompt you already send is spending, and cut what the task does not need. Coming soon.</li>",
      "        <li><strong>Context layout</strong> Decide what stays in the window for one real request, and what to drop. Coming soon.</li>",
      "        <li><strong>Prompt rewrite</strong> Turn a loose instruction into one a teammate could reuse. Coming soon.</li>",
      "      </ul>",
      "      <p>The other concepts on this track do not have a named set yet. They are listed below.</p>"
    ].join("\n");
  } else {
    sets = [
      "      <h2>Planned sets</h2>",
      "      <p>One set per concept below: a worked example, a checklist, and one change in a prompt or repo you already have. None of those sets are written yet.</p>"
    ].join("\n");
  }
  return [
    '      <p class="crumb"><a href="/pricing">Pricing</a> · ' + esc(track.name) + "</p>",
    '      <p class="kicker">Track pack · Coming soon</p>',
    "      <h1>" + esc(track.name) + " pack</h1>",
    '      <p class="tier-price">€39 <span>once</span></p>',
    '      <p class="lede">' + esc(track.pack) + "</p>",
    '      <p class="soon-note">Coming soon. This pack is not for sale on this site. The email links open a message to ' + esc(site.email) + " with the tier and the track in the subject. There is no form and no payment.</p>",
    sets,
    "      <h2>Cards this pack sits beside</h2>",
    "      <p>These are the concept cards. The cards are free. " + liveSentence(list) + " A coming soon name is not a card yet.</p>",
    '      <ul class="concept-index">',
    list.map(conceptItem).join("\n"),
    "      </ul>",
    '      <p class="cta-row">',
    '        <a class="button" href="' + waitlist("Track pack", track.name) + '">Join the waitlist</a>',
    '        <a class="button ghost" href="' + waitlist("Founding member - Track pack", track.name) + '">Founding member, about 30% off</a>',
    "      </p>",
    '      <p class="fine">See the other tiers on <a href="/pricing">Pricing</a>, or the concept list on the <a href="/tracks/' + track.slug + '">' + esc(track.name) + " track</a>.</p>"
  ].join("\n");
}

function stripSeo(html) {
  return html
    .replace(/\n  <meta name="robots" content="noindex" \/>/g, "")
    .replace(/\n  <link rel="canonical" href="[^"]*" \/>/g, "")
    .replace(/\n  <meta property="og:[^"]+" content="[^"]*" \/>/g, "")
    .replace(/\n  <meta name="twitter:[^"]+" content="[^"]*" \/>/g, "");
}

function ensureHead(html, page) {
  html = stripSeo(html);
  if (!new RegExp("<title>" + page.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "</title>").test(html)) {
    throw new Error(page.file + " title is not " + page.title);
  }
  var description = '<meta name="description" content="' + esc(page.description) + '" />';
  if (/<meta name="description" content="[^"]*" \/>/.test(html)) {
    html = html.replace(/<meta name="description" content="[^"]*" \/>/, description);
  } else {
    html = html.replace(/<\/title>/, "</title>\n  " + description);
  }
  html = html.replace(/(<meta name="description" content="[^"]*" \/>)/, "$1\n" + seoTags(page));
  return html;
}

function ensureNav(html) {
  var nav = html.match(/<nav[\s\S]*?<\/nav>/);
  if (nav && nav[0].indexOf('href="/pricing"') !== -1) return html;
  return html.replace(
    /(<a href="\/apply"(?: aria-current="page")?>Apply<\/a>)/,
    "$1\n        <a href=\"/pricing\">Pricing</a>"
  );
}

function ensureFooter(html) {
  if (html.indexOf('<footer class="foot">') === -1) return html;
  return html.replace(/\n[ \t]*<footer class="foot">[\s\S]*?<\/footer>/, "\n" + footer());
}

function ensureSiteScript(html) {
  if (html.indexOf("/concepts-data.js") === -1) return html;
  if (html.indexOf("/site.js") !== -1) return html;
  return html.replace(
    '<script src="/concepts-data.js"></script>',
    '<script src="/site.js"></script>\n  <script src="/concepts-data.js"></script>'
  );
}

function jsonBlock(data) {
  var json = JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
  return '<script type="application/ld+json">\n' + json + "\n  </script>";
}

function upsertJson(html, data) {
  var block = jsonBlock(data);
  if (html.indexOf('application/ld+json') !== -1) {
    return html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, block);
  }
  return html.replace("</head>", "  " + block + "\n</head>");
}

function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: abs("/"),
    logo: site.origin + "/assets/brand/logo.svg",
    email: site.email,
    description: "A practical map and cards for builders who already use AI."
  };
}

function cardLd(html, page) {
  var concept = concepts.filter(function (item) { return item.id === page.concept; })[0];
  var definition = mustMatch(html, /<p class="definition"[^>]*>([\s\S]*?)<\/p>/, page.file + " definition");
  var faqs = [];
  var re = /<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g;
  var match;
  while ((match = re.exec(html))) {
    faqs.push({
      "@type": "Question",
      name: stripTags(match[1]),
      acceptedAnswer: { "@type": "Answer", text: stripTags(match[2]) }
    });
  }
  if (faqs.length < 2) throw new Error(page.file + " needs a visible FAQ");
  var url = abs(page.path);
  var resource = {
    "@type": "LearningResource",
    "@id": url + "#card",
    name: concept.title,
    description: definition,
    url: url,
    learningResourceType: "Concept card",
    isAccessibleForFree: concept.access === "free",
    inLanguage: "en",
    provider: { "@type": "Organization", name: site.name, url: abs("/") }
  };
  if (concept.lastChecked) resource.dateModified = concept.lastChecked;
  return {
    "@context": "https://schema.org",
    "@graph": [
      resource,
      {
        "@type": "FAQPage",
        "@id": url + "#faq",
        url: url,
        mainEntity: faqs
      }
    ]
  };
}

function markdownFor(file, page) {
  var html = fs.readFileSync(path.join(root, file), "utf8");
  var concept = concepts.filter(function (item) { return item.id === page.concept; })[0];
  var definition = mustMatch(html, /<p class="definition"[^>]*>([\s\S]*?)<\/p>/, "definition");
  var what = mustMatch(html, /<section class="part">[\s\S]*?<h2>[\s\S]*?<\/h2>\s*<p>([\s\S]*?)<\/p>/, "what");
  var whys = [];
  var whyRe = /<article>\s*<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>\s*<\/article>/g;
  var whyMatch;
  while ((whyMatch = whyRe.exec(html))) {
    whys.push("**" + stripTags(whyMatch[1]) + ".** " + stripTags(whyMatch[2]));
  }
  if (whys.length !== 3) throw new Error(file + " expected 3 why blocks");
  var today = mustMatch(html, /<section class="apply-card">[\s\S]*?<p>([\s\S]*?)<\/p>/, "try today");
  var mistake = mustMatch(html, /<section class="mistake">[\s\S]*?<p>([\s\S]*?)<\/p>/, "mistake");
  var question = mustMatch(html, /<p class="check-q">([\s\S]*?)<\/p>/, "self-check");
  var answer = mustMatch(html, /data-correct="true"[^>]*>([\s\S]*?)<\/button>/, "answer");
  var soons = [];
  var soonRe = /<p class="soon-note">([\s\S]*?)<\/p>/g;
  var soonMatch;
  while ((soonMatch = soonRe.exec(html))) soons.push(stripTags(soonMatch[1]));
  var lines = [
    "# " + concept.title,
    "",
    "> " + definition,
    "",
    concept.summary,
    "",
    "Track: " + concept.track,
    "Access: " + concept.access,
    "Card: " + abs(page.path),
    "Plain text: " + abs(page.path) + ".md",
    "Last checked: " + (concept.lastChecked || "not checked"),
    "",
    "## What it is",
    "",
    what,
    "",
    "## Why it matters",
    "",
    whys.join("\n\n"),
    "",
    "## Try today",
    "",
    today,
    "",
    "## Common mistake",
    "",
    mistake,
    "",
    "## Self-check",
    "",
    question,
    "",
    answer.replace(/^[A-C] · /, ""),
    "",
    "## Practice and deep",
    "",
    soons.join("\n\n"),
    "",
    "## Sources",
    "",
    "Sources pending. No provider doc is cited on this card yet.",
    ""
  ];
  return lines.join("\n");
}

var pages = [
  {
    file: "index.html",
    path: "/",
    title: "Concepts · BuildSpark AI",
    description: "The practical map and cards for builders who already use AI. Concept cards, the map, and Ask are free.",
    org: true
  },
  {
    file: "map.html",
    path: "/map",
    title: "Map · BuildSpark AI",
    description: "The BuildSpark AI curriculum map across Foundations, Retrieval and Grounding, Agents, and Ship and Maintain. Live cards are links."
  },
  {
    file: "ask.html",
    path: "/ask",
    title: "Ask · BuildSpark AI",
    description: "Match a question to a BuildSpark AI concept card. Keyword match in the browser, with no model call and no account."
  },
  {
    file: "apply.html",
    path: "/apply",
    title: "Apply packs · BuildSpark AI",
    description: "Track packs are future practice beside the free BuildSpark AI cards. None are open yet. The waitlist is an email, not a form."
  },
  {
    file: "pricing.html",
    path: "/pricing",
    title: "Pricing · BuildSpark AI",
    description: "Free concept cards, map, and Ask. Track packs are €39 once. All-access is €15 a month or €129 a year. Teams are €12 a seat each month, minimum 5."
  },
  {
    file: "about.html",
    path: "/about",
    title: "About · BuildSpark AI",
    description: "BuildSpark AI is a practical map and cards for builders who already use AI, who it is for, how cards stay current, and how to contact support."
  },
  {
    file: "tokens.html",
    path: "/tokens",
    title: "Tokens · BuildSpark AI",
    description: "Tokens are the pieces of text a model reads, writes, and bills for. A free BuildSpark AI concept card.",
    type: "article",
    concept: "tokens"
  },
  {
    file: "context-window.html",
    path: "/context-window",
    title: "Context Window · BuildSpark AI",
    description: "The context window is the fixed text one request can hold: instructions, history, documents, and the answer. A free BuildSpark AI concept card.",
    type: "article",
    concept: "context-window"
  },
  {
    file: "prompting.html",
    path: "/prompting",
    title: "Prompting · BuildSpark AI",
    description: "Prompting is how you state the task this turn: the reader, the shape, and what to leave out. A free BuildSpark AI concept card.",
    type: "article",
    concept: "prompting"
  },
  {
    file: "404.html",
    path: "/404",
    title: "Not found · BuildSpark AI",
    description: "That page is not on BuildSpark AI.",
    noindex: true,
    sitemap: false
  }
];

var urls = [];

pages.forEach(function (page) {
  var filePath = path.join(root, page.file);
  var html = fs.readFileSync(filePath, "utf8");
  html = ensureNav(html);
  html = ensureHead(html, page);
  html = ensureFooter(html);
  html = ensureSiteScript(html);
  if (page.org) html = upsertJson(html, organizationLd());
  if (page.concept) html = upsertJson(html, cardLd(html, page));
  fs.writeFileSync(filePath, html);
  if (page.sitemap !== false) urls.push({ loc: abs(page.path), lastmod: page.concept ? "2026-10-16" : null });
  if (!html.includes(LOGO)) throw new Error(page.file + " is missing the logo");
  if (!html.includes('href="/assets/brand/favicon.svg"')) throw new Error(page.file + " is missing favicons");
  if (!html.includes("· BuildSpark AI")) throw new Error(page.file + " title format");
  var navBlock = html.match(/<nav[\s\S]*?<\/nav>/);
  if (!navBlock || navBlock[0].indexOf('href="/pricing"') === -1) throw new Error(page.file + " nav is missing Pricing");
});

site.tracks.forEach(function (track) {
  var list = inTrack(track.name);
  if (!list.length) throw new Error("No concepts for " + track.name);
  var trackPage = {
    path: "/tracks/" + track.slug,
    title: track.name + " track · BuildSpark AI",
    description: trackDescription(track, list)
  };
  var packPage = {
    path: "/packs/" + track.slug,
    title: track.name + " pack · BuildSpark AI",
    description: packDescription(track)
  };
  fs.mkdirSync(path.join(root, "tracks"), { recursive: true });
  fs.mkdirSync(path.join(root, "packs"), { recursive: true });
  var trackHtml = pageShell(trackPage, trackBody(track, list));
  var packHtml = pageShell(packPage, packBody(track, list));
  list.forEach(function (concept) {
    if (trackHtml.indexOf(esc(concept.title)) === -1) throw new Error(track.slug + " missing " + concept.title);
    if (packHtml.indexOf(esc(concept.title)) === -1) throw new Error(track.slug + " pack missing " + concept.title);
  });
  fs.writeFileSync(path.join(root, "tracks", track.slug + ".html"), trackHtml);
  fs.writeFileSync(path.join(root, "packs", track.slug + ".html"), packHtml);
  [trackHtml, packHtml].forEach(function (html, index) {
    var label = (index === 0 ? "tracks/" : "packs/") + track.slug + ".html";
    if (!html.includes(LOGO)) throw new Error(label + " missing logo");
    if (!html.includes('href="/assets/brand/favicon.svg"')) throw new Error(label + " missing favicons");
    if (!html.includes("· BuildSpark AI")) throw new Error(label + " title");
  });
  urls.push({ loc: abs(trackPage.path) });
  urls.push({ loc: abs(packPage.path) });
});

pages.filter(function (page) { return page.concept; }).forEach(function (page) {
  var md = markdownFor(page.file, page);
  fs.writeFileSync(path.join(root, page.concept + ".md"), md);
  urls.push({ loc: abs(page.path) + ".md", lastmod: "2026-10-16" });
});

var live = concepts.filter(function (concept) { return concept.status === "live"; });
if (live.length !== 3) throw new Error("Expected 3 live concepts");

var llms = [];
llms.push("# " + site.name);
llms.push("");
llms.push("> A practical map and cards for builders who already use AI.");
llms.push("");
llms.push("Concept cards, the map, and Ask are free. Track packs are future practice and are not open yet. There is no account and no payment on this site. Coming soon concepts are listed on the track pages and do not have cards yet.");
llms.push("");
llms.push("## Live concepts");
llms.push("");
live.forEach(function (concept) {
  llms.push("- [" + concept.title + "](" + abs("/" + concept.id) + "): " + concept.summary + " Plain text: " + abs("/" + concept.id) + ".md");
});
llms.push("");
llms.push("## Tracks");
llms.push("");
site.tracks.forEach(function (track) {
  llms.push("- [" + track.name + "](" + abs("/tracks/" + track.slug) + "): " + track.summary);
});
llms.push("");
llms.push("## Packs");
llms.push("");
site.tracks.forEach(function (track) {
  llms.push("- [" + track.name + " pack](" + abs("/packs/" + track.slug) + "): Coming soon. €39 one-off for practice beside the free " + track.name + " cards.");
});
llms.push("");
llms.push("## Site");
llms.push("");
llms.push("- [Home](" + abs("/") + "): Practical map and cards for builders who already use AI.");
llms.push("- [Map](" + abs("/map") + "): The curriculum and its prerequisite links.");
llms.push("- [Ask](" + abs("/ask") + "): Keyword match against concept titles, summaries, and live card text. No model call.");
llms.push("- [Pricing](" + abs("/pricing") + "): Free cards, €39 track packs, all-access, and teams. No checkout.");
llms.push("- [About](" + abs("/about") + "): What BuildSpark AI is, who it is for, and how cards are sourced.");
llms.push("- [Changelog](" + abs("/changelog") + "): Updates that have shipped on the site.");
llms.push("");
fs.writeFileSync(path.join(root, "llms.txt"), llms.join("\n"));
urls.push({ loc: abs("/llms.txt") });
writeChangelog(urls);
writeCardText(live);

var robots = [];
robots.push("# " + site.name);
robots.push("# Canonical origin: " + site.origin);
robots.push("# Change origin in site.js and rerun scripts/generate-site.js");
robots.push("# llms.txt: " + abs("/llms.txt"));
robots.push("");
[
  "*",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "Google-Extended",
  "Googlebot",
  "Bingbot",
  "Anthropic-ai",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Amazonbot",
  "Applebot",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "cohere-ai",
  "Meta-ExternalAgent",
  "FacebookBot",
  "Diffbot",
  "YouBot"
].forEach(function (agent) {
  robots.push("User-agent: " + agent);
  robots.push("Allow: /");
  robots.push("");
});
robots.push("Sitemap: " + abs("/sitemap.xml"));
robots.push("");
fs.writeFileSync(path.join(root, "robots.txt"), robots.join("\n"));

var sitemap = [];
sitemap.push('<?xml version="1.0" encoding="UTF-8"?>');
sitemap.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
urls.forEach(function (url) {
  sitemap.push("  <url>");
  sitemap.push("    <loc>" + esc(url.loc) + "</loc>");
  if (url.lastmod) sitemap.push("    <lastmod>" + url.lastmod + "</lastmod>");
  sitemap.push("  </url>");
});
sitemap.push("</urlset>");
sitemap.push("");
fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap.join("\n"));

var titles = {};
pages.forEach(function (page) {
  if (titles[page.title]) throw new Error("Duplicate title " + page.title);
  titles[page.title] = true;
});
site.tracks.forEach(function (track) {
  [" track", " pack"].forEach(function (suffix) {
    var title = track.name + suffix + " · BuildSpark AI";
    if (titles[title]) throw new Error("Duplicate title " + title);
    titles[title] = true;
  });
});

if (titles["Changelog · BuildSpark AI"]) throw new Error("Duplicate title Changelog · BuildSpark AI");
titles["Changelog · BuildSpark AI"] = true;

console.log("Wrote " + urls.length + " sitemap URLs, " + live.length + " markdown cards, " + site.tracks.length + " tracks.");

function validateUpdates(list, registry) {
  if (!Array.isArray(list) || !list.length) throw new Error("updates-data.js did not set BF_UPDATES");
  var known = Object.create(null);
  registry.forEach(function (concept) { known[concept.id] = true; });
  list.forEach(function (entry, index) {
    var label = "update " + (index + 1);
    if (!entry || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date || "")) throw new Error(label + " has no YYYY-MM-DD date");
    if (!entry.title || !String(entry.title).trim()) throw new Error(label + " has no title");
    if (!entry.line || !String(entry.line).trim()) throw new Error(label + " has no line");
    if (!Array.isArray(entry.concepts)) throw new Error(label + " concepts is not a list");
    entry.concepts.forEach(function (id) {
      if (!known[id]) throw new Error(label + " cites unknown concept " + id);
    });
  });
}

function conceptById(id) {
  for (var i = 0; i < concepts.length; i++) {
    if (concepts[i].id === id) return concepts[i];
  }
  return null;
}

function changelogBody() {
  var items = updates.map(function (entry) {
    var names = entry.concepts.map(function (id) {
      var concept = conceptById(id);
      if (concept.status === "live") return '<a href="/' + concept.id + '">' + esc(concept.title) + "</a>";
      return esc(concept.title);
    });
    var lines = [
      "      <li>",
      '        <p class="kicker">' + esc(entry.date) + "</p>",
      '        <h2 class="log-title">' + esc(entry.title) + "</h2>",
      "        <p>" + esc(entry.line) + "</p>"
    ];
    if (names.length) lines.push('        <p class="fine">' + names.join(", ") + "</p>");
    lines.push("      </li>");
    return lines.join("\n");
  }).join("\n");
  return [
    '      <p class="kicker">Changelog</p>',
    "      <h1>What has shipped</h1>",
    '      <p class="lede">Updates to the live site. Each line is a change that already shipped.</p>',
    '      <ol class="changelog">',
    items,
    "      </ol>"
  ].join("\n");
}

function writeChangelog(urls) {
  var page = {
    path: "/changelog",
    title: "Changelog · BuildSpark AI",
    description: "Updates that have shipped on BuildSpark AI: the concepts site at the root, card template v2, and the Tokens and Context Window cost notes."
  };
  var html = pageShell(page, changelogBody());
  if (!html.includes(LOGO)) throw new Error("changelog.html is missing the logo");
  if (!html.includes('href="/assets/brand/favicon.svg"')) throw new Error("changelog.html is missing favicons");
  fs.writeFileSync(path.join(root, "changelog.html"), html);
  var lastmod = updates.map(function (entry) { return entry.date; }).sort().pop();
  urls.push({ loc: abs(page.path), lastmod: lastmod });
}

function cardSearchText(html) {
  var mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (!mainMatch) return "";
  var main = mainMatch[1];
  main = main.replace(/<p class="crumb">[\s\S]*?<\/p>/i, " ");
  main = main.replace(/<aside\b[\s\S]*?<\/aside>/gi, " ");
  main = main.replace(/<div class="tabs"[\s\S]*?<\/div>/i, " ");
  main = main.replace(/<p class="ask-about">[\s\S]*?<\/p>/i, " ");
  main = main.replace(/<script\b[\s\S]*?<\/script>/gi, " ");
  return stripTags(main);
}

function writeCardText(liveConcepts) {
  var text = {};
  liveConcepts.forEach(function (concept) {
    var file = path.join(root, concept.id + ".html");
    if (!fs.existsSync(file)) throw new Error("live concept " + concept.id + " has no HTML file for Ask");
    var body = cardSearchText(fs.readFileSync(file, "utf8"));
    if (!body) throw new Error("live concept " + concept.id + " produced no card text");
    text[concept.id] = body;
  });
  var json = JSON.stringify(text, null, 2).replace(/</g, "\\u003c");
  var out = [
    "/* Plain text of live cards for Ask. Written by scripts/generate-site.js.",
    "   Regenerated from each live concept's HTML. */",
    "var BF_CARD_TEXT = " + json + ";",
    ""
  ].join("\n");
  fs.writeFileSync(path.join(root, "card-text.js"), out);
}
