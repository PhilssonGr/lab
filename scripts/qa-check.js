/* Static site QA for the Netlify tree. From the repo root:

     node scripts/qa-check.js

   Uses Node built-ins only. Exits 1 and prints every problem it found.
   Running the generator is undone before the process exits, so a failure
   does not leave generated files edited. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");
var childProcess = require("child_process");

var root = path.join(__dirname, "..");

var FAVICONS = [
  ["icon", "/assets/brand/favicon.svg"],
  ["icon", "/assets/brand/favicon-32.png"],
  ["icon", "/assets/brand/favicon-16.png"],
  ["shortcut icon", "/assets/brand/favicon.ico"],
  ["apple-touch-icon", "/assets/brand/apple-touch-icon.png"]
];

var LOGO_SRC = "/assets/brand/logo.svg";

function main() {
  var started = process.hrtime.bigint();
  var problems = [];

  function fail(group, message) {
    problems.push({ group: group, message: message });
  }

  var originUrl = null;
  try {
    var site = loadVm("site.js").BF_SITE;
    if (!site || !site.origin) throw new Error("site.js did not set BF_SITE.origin");
    originUrl = new URL(site.origin);
    if (originUrl.protocol !== "http:" && originUrl.protocol !== "https:") {
      throw new Error("BF_SITE.origin must be an http(s) URL");
    }
  } catch (error) {
    fail("Pages", error.message);
  }

  var concepts = null;
  try {
    concepts = loadVm("concepts-data.js").BF_CONCEPTS;
  } catch (error) {
    fail("Registry", "concepts-data.js failed to load: " + error.message);
  }

  var rules = readRedirects(fail);
  var htmlFiles = listFiles(function (rel) { return rel.endsWith(".html"); });
  var stats = {
    html: htmlFiles.length,
    internal: 0,
    viaRedirect: 0,
    skipped: 0,
    rules: rules.length,
    concepts: 0,
    live: 0,
    jsonLd: 0
  };

  if (!htmlFiles.length) fail("Pages", "no HTML files found");

  htmlFiles.forEach(function (rel) {
    checkHtml(rel, originUrl, rules, stats, fail);
  });

  if (concepts) checkRegistry(concepts, rules, stats, fail);

  var snap = snapshotTree();
  try {
    checkGenerator(snap, fail);
  } finally {
    restoreTree(snap);
  }

  var elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  if (problems.length) {
    reportFailures(problems, elapsedMs);
    process.exit(1);
  }

  console.log("QA passed in " + formatMs(elapsedMs));
  console.log("Links: " + stats.internal + " internal href/src in " + stats.html + " HTML files resolve (" + stats.viaRedirect + " by a _redirects rule, " + stats.rules + " rules loaded, " + stats.skipped + " mailto/fragment/off-site skipped)");
  console.log("Pages: " + stats.html + " HTML files have a title, meta description, canonical, logo, and favicon links");
  console.log("Generator: node scripts/generate-site.js produced no diff");
  console.log("Registry: " + stats.concepts + " concepts, ids unique, prerequisites resolve, " + stats.live + " live concepts have pages");
  console.log("JSON-LD: " + stats.jsonLd + " blocks parse");
}

function checkHtml(rel, originUrl, rules, stats, fail) {
  var html = readText(path.join(root, rel));
  var masked = maskNonMarkup(html);
  var pagePath = pagePublicPath(rel);
  var base = originUrl ? new URL(pagePath, originUrl) : new URL(pagePath, "https://qa.local/");

  checkHead(rel, masked, fail);
  checkJsonLd(rel, html, stats, fail);

  eachTag(masked, function (tag, attrs, index) {
    ["href", "src"].forEach(function (attr) {
      if (!Object.prototype.hasOwnProperty.call(attrs, attr)) return;
      var raw = attrs[attr];
      var classified = classifyRef(raw, base);
      if (classified.kind === "skip") {
        stats.skipped += 1;
        return;
      }
      stats.internal += 1;
      if (classified.kind === "bad") {
        fail("Links", rel + ":" + lineOf(html, index) + ": " + attr + "=\"" + clip(raw) + "\" " + classified.detail);
        return;
      }
      var resolved = resolvePath(classified.pathname, rules);
      if (!resolved.ok) {
        fail("Links", rel + ":" + lineOf(html, index) + ": " + attr + "=\"" + clip(raw) + "\" does not resolve to a file, an extensionless route, or a _redirects rule");
        return;
      }
      if (resolved.via === "redirect") stats.viaRedirect += 1;
    });
  });
}

function checkHead(rel, html, fail) {
  var headMatch = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  var head = headMatch ? headMatch[1] : "";
  if (!headMatch) fail("Pages", rel + ": missing <head>");

  var titleMatch = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) fail("Pages", rel + ": missing <title>");
  else if (!decodeEntities(titleMatch[1].replace(/<[^>]+>/g, "")).trim()) {
    fail("Pages", rel + ": <title> is empty");
  }

  var metas = tagsIn(head, "meta");
  var description = metas.filter(function (tag) {
    return (tag.attrs.name || "").toLowerCase() === "description";
  })[0];
  if (!description) fail("Pages", rel + ": missing <meta name=\"description\">");
  else if (!String(description.attrs.content || "").trim()) {
    fail("Pages", rel + ": meta description is empty");
  }

  var canonical = tagsIn(head, "link").filter(function (tag) {
    return normRel(tag.attrs.rel) === "canonical";
  })[0];
  if (!canonical) fail("Pages", rel + ": missing <link rel=\"canonical\">");
  else if (!String(canonical.attrs.href || "").trim()) {
    fail("Pages", rel + ": canonical href is empty");
  }

  var logo = tagsIn(html, "img").some(function (tag) {
    return tag.attrs.src === LOGO_SRC;
  });
  if (!logo) fail("Pages", rel + ": missing logo <img src=\"" + LOGO_SRC + "\">");

  var links = tagsIn(head, "link");
  FAVICONS.forEach(function (spec) {
    var found = links.some(function (tag) {
      return normRel(tag.attrs.rel) === spec[0] && tag.attrs.href === spec[1];
    });
    if (!found) {
      fail("Pages", rel + ": missing <link rel=\"" + spec[0] + "\" href=\"" + spec[1] + "\">");
    }
  });
}

function checkJsonLd(rel, html, stats, fail) {
  var re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  var match;
  var index = 0;
  while ((match = re.exec(html))) {
    var attrs = parseAttrs(match[1]);
    if ((attrs.type || "").toLowerCase() !== "application/ld+json") continue;
    index += 1;
    var body = match[2].trim();
    if (!body) {
      fail("JSON-LD", rel + ": JSON-LD block " + index + " is empty");
      continue;
    }
    try {
      JSON.parse(body);
      stats.jsonLd += 1;
    } catch (error) {
      fail("JSON-LD", rel + ": JSON-LD block " + index + " did not parse: " + error.message);
    }
  }
}

function checkRegistry(concepts, rules, stats, fail) {
  if (!Array.isArray(concepts)) {
    fail("Registry", "concepts-data.js did not set BF_CONCEPTS to an array");
    return;
  }
  stats.concepts = concepts.length;
  var seen = Object.create(null);
  var ids = Object.create(null);

  concepts.forEach(function (concept, index) {
    var label = "concept " + (index + 1);
    if (!concept || typeof concept.id !== "string" || !concept.id.trim()) {
      fail("Registry", label + " has no id");
      return;
    }
    var id = concept.id;
    if (seen[id]) {
      fail("Registry", "duplicate concept id \"" + id + "\" (concepts " + seen[id] + " and " + (index + 1) + ")");
    } else {
      seen[id] = index + 1;
    }
    ids[id] = true;
  });

  concepts.forEach(function (concept) {
    if (!concept || typeof concept.id !== "string" || !concept.id) return;
    var prereqs = concept.prerequisites;
    if (!Array.isArray(prereqs)) {
      fail("Registry", "concept \"" + concept.id + "\" prerequisites is not a list");
      return;
    }
    prereqs.forEach(function (pre) {
      if (typeof pre !== "string" || !ids[pre]) {
        fail("Registry", "concept \"" + concept.id + "\" prerequisite " + JSON.stringify(pre) + " does not match a concept id");
      }
    });
    if (concept.status === "live") {
      stats.live += 1;
      var route = "/" + concept.id.split("/").map(encodeURIComponent).join("/");
      var resolved = resolvePath(route, rules);
      if (!resolved.ok || resolved.via === "redirect") {
        fail("Registry", "live concept \"" + concept.id + "\" has no page at " + route);
      }
    }
  });
}

function checkGenerator(snap, fail) {
  var script = path.join(root, "scripts", "generate-site.js");
  if (!fs.existsSync(script)) {
    fail("Generator", "scripts/generate-site.js is missing");
    return;
  }
  var result = childProcess.spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    timeout: 20000
  });
  if (result.error) {
    fail("Generator", "node scripts/generate-site.js failed: " + result.error.message);
    return;
  }
  if (result.signal || result.status !== 0) {
    var output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    var why = result.signal ? "killed by signal " + result.signal : "exited " + result.status;
    var detail = summarizeProcessOutput(output);
    fail("Generator", "node scripts/generate-site.js " + why + (detail ? ": " + detail : ""));
    return;
  }
  var current = snapshotTree();
  var delta = treeDelta(snap, current);
  if (!delta.length) return;
  var lines = ["node scripts/generate-site.js produced a diff (" + delta.length + " file" + (delta.length === 1 ? "" : "s") + "):"];
  delta.forEach(function (change) {
    lines.push("");
    lines.push(change.summary);
    if (change.diff) lines.push(change.diff);
  });
  fail("Generator", lines.join("\n"));
}

function readRedirects(fail) {
  var abs = path.join(root, "_redirects");
  if (!fs.existsSync(abs)) {
    fail("Links", "_redirects is missing, so redirect rules cannot be checked");
    return [];
  }
  var rules = [];
  readText(abs).split(/\n/).forEach(function (raw, index) {
    var line = raw.trim();
    var lineNo = index + 1;
    if (!line || line.charAt(0) === "#") return;
    var parts = line.split(/\s+/);
    if (parts.length < 2) {
      fail("Links", "_redirects:" + lineNo + ": expected a from path and a to path");
      return;
    }
    if (parts[0].charAt(0) !== "/") {
      fail("Links", "_redirects:" + lineNo + ": rule \"" + parts[0] + "\" does not start with /");
      return;
    }
    rules.push({ from: parts[0], re: compileFrom(parts[0]), line: lineNo });
  });
  return rules;
}

function compileFrom(from) {
  var body = "";
  for (var i = 0; i < from.length; i++) {
    var ch = from.charAt(i);
    if (ch === "*") {
      body += "(.*)";
      continue;
    }
    if (ch === ":" && /[A-Za-z_]/.test(from.charAt(i + 1))) {
      i += 1;
      while (i < from.length && /[A-Za-z0-9_]/.test(from.charAt(i))) i += 1;
      i -= 1;
      body += "([^/]+)";
      continue;
    }
    if ("\\^$+?()[]{}|.".indexOf(ch) !== -1) body += "\\" + ch;
    else body += ch;
  }
  return new RegExp("^" + body + "$");
}

function classifyRef(raw, base) {
  var value = decodeEntities(String(raw)).trim();
  if (!value || value.charAt(0) === "#") return { kind: "skip" };
  var url;
  try {
    url = new URL(value, base);
  } catch (error) {
    return { kind: "bad", detail: "is not a valid URL" };
  }
  var protocol = url.protocol;
  if (protocol === "mailto:" || protocol === "tel:" || protocol === "sms:" || protocol === "javascript:" || protocol === "data:") {
    return { kind: "skip" };
  }
  if (protocol !== "http:" && protocol !== "https:") {
    return { kind: "bad", detail: "uses unsupported protocol " + protocol };
  }
  // Relative and root-relative links inherit the page host. A different host is off-site.
  if (url.host !== base.host) return { kind: "skip" };
  return { kind: "internal", pathname: url.pathname };
}

function resolvePath(pathname, rules) {
  var normalized = normalizePath(pathname);
  if (!normalized) return { ok: false };
  // /map and /map/ both serve map.html. Redirect rules stay exact, including trailing slashes.
  if (fileForPath(normalized)) return { ok: true, via: "file" };
  if (rules.some(function (rule) { return rule.re.test(normalized); })) {
    return { ok: true, via: "redirect" };
  }
  return { ok: false };
}

function fileForPath(urlPath) {
  var segments = [];
  urlPath.split("/").forEach(function (part) {
    if (part && part !== ".") {
      if (part === "..") segments.pop();
      else segments.push(part);
    }
  });
  if (!segments.length) return isFile("index.html") ? "index.html" : null;
  var rel = segments.join("/");
  var ext = path.posix.extname(rel);
  var candidates = [rel];
  if (!ext) {
    candidates.push(rel + ".html");
    candidates.push(rel + "/index.html");
  }
  for (var i = 0; i < candidates.length; i++) {
    if (isFile(candidates[i])) return candidates[i];
  }
  return null;
}

function normalizePath(pathname) {
  var decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch (error) {
    return null;
  }
  if (decoded.indexOf("\0") !== -1) return null;
  var trailing = decoded.length > 1 && decoded.charAt(decoded.length - 1) === "/";
  var segments = [];
  decoded.split("/").forEach(function (part) {
    if (!part || part === ".") return;
    if (part === "..") segments.pop();
    else segments.push(part);
  });
  var joined = "/" + segments.join("/");
  if (trailing && joined !== "/") joined += "/";
  return joined;
}

function isFile(rel) {
  var abs = insideRoot(rel);
  if (!abs) return false;
  try {
    return fs.statSync(abs).isFile();
  } catch (error) {
    return false;
  }
}

function insideRoot(rel) {
  var abs = path.resolve(root, rel);
  var back = path.relative(root, abs);
  if (!back || back === "") return abs === root ? abs : null;
  if (back === ".." || back.indexOf(".." + path.sep) === 0 || path.isAbsolute(back)) return null;
  return abs;
}

function pagePublicPath(relFile) {
  var p = relFile.split(path.sep).join("/");
  if (p === "index.html") return "/";
  if (p.endsWith("/index.html")) return "/" + p.slice(0, -"index.html".length);
  if (p.endsWith(".html")) p = p.slice(0, -".html".length);
  return "/" + p;
}

function loadVm(rel) {
  var context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), context, { filename: rel });
  return context;
}

function listFiles(pred) {
  var out = [];
  function walk(abs, rel) {
    fs.readdirSync(abs, { withFileTypes: true }).forEach(function (ent) {
      if (rel === "" && (ent.name === ".git" || ent.name === "node_modules")) return;
      var childRel = rel ? rel + "/" + ent.name : ent.name;
      var childAbs = path.join(abs, ent.name);
      if (ent.isDirectory()) walk(childAbs, childRel);
      else if (ent.isFile() && (!pred || pred(childRel))) out.push(childRel);
    });
  }
  walk(root, "");
  out.sort();
  return out;
}

function snapshotTree() {
  var files = new Map();
  var dirs = new Set();
  function walk(abs, rel) {
    fs.readdirSync(abs, { withFileTypes: true }).forEach(function (ent) {
      if (rel === "" && (ent.name === ".git" || ent.name === "node_modules")) return;
      var childRel = rel ? rel + "/" + ent.name : ent.name;
      var childAbs = path.join(abs, ent.name);
      if (ent.isDirectory()) {
        dirs.add(childRel);
        walk(childAbs, childRel);
      } else if (ent.isFile()) {
        files.set(childRel, fs.readFileSync(childAbs));
      }
    });
  }
  walk(root, "");
  return { files: files, dirs: dirs };
}

function restoreTree(snap) {
  var current = snapshotTree();
  current.files.forEach(function (buf, rel) {
    if (!snap.files.has(rel)) {
      try { fs.unlinkSync(path.join(root, rel)); } catch (error) { /* already gone */ }
    }
  });
  snap.files.forEach(function (buf, rel) {
    var now = current.files.get(rel);
    if (now && now.equals(buf)) return;
    var abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buf);
  });
  var extras = [];
  snapshotTree().dirs.forEach(function (rel) {
    if (!snap.dirs.has(rel)) extras.push(rel);
  });
  extras.sort(function (a, b) { return b.length - a.length; });
  extras.forEach(function (rel) {
    var abs = path.join(root, rel);
    try {
      if (fs.readdirSync(abs).length === 0) fs.rmdirSync(abs);
    } catch (error) { /* already gone */ }
  });
}

function treeDelta(before, after) {
  var names = new Set();
  before.files.forEach(function (_buf, rel) { names.add(rel); });
  after.files.forEach(function (_buf, rel) { names.add(rel); });
  var changes = [];
  Array.from(names).sort().forEach(function (rel) {
    var prev = before.files.get(rel);
    var next = after.files.get(rel);
    if (prev && next && prev.equals(next)) return;
    if (!prev) {
      changes.push({ summary: "added " + rel, diff: previewLines(next, "+") });
      return;
    }
    if (!next) {
      changes.push({ summary: "removed " + rel, diff: previewLines(prev, "-") });
      return;
    }
    if (prev.includes(0) || next.includes(0)) {
      changes.push({ summary: "changed " + rel + " (binary)", diff: "" });
      return;
    }
    changes.push({
      summary: "changed " + rel,
      diff: unifiedDiff(rel, prev.toString("utf8"), next.toString("utf8"))
    });
  });
  return changes;
}

function previewLines(buf, mark) {
  if (buf.includes(0)) return "(binary)";
  var lines = buf.toString("utf8").split("\n").slice(0, 20);
  return lines.map(function (line) { return mark + line; }).join("\n");
}

function unifiedDiff(rel, beforeText, afterText) {
  var a = beforeText.split("\n");
  var b = afterText.split("\n");
  if (a.length > 800 || b.length > 800) {
    return firstMismatch(a, b);
  }
  var rows = lcsRows(a, b);
  var shown = [];
  var skipped = false;
  rows.forEach(function (row, index) {
    if (row.kind === " ") {
      var near = false;
      for (var k = Math.max(0, index - 2); k <= Math.min(rows.length - 1, index + 2); k++) {
        if (rows[k].kind !== " ") near = true;
      }
      if (!near) {
        skipped = true;
        return;
      }
    }
    if (skipped) {
      shown.push("...");
      skipped = false;
    }
    shown.push((row.kind === " " ? " " : row.kind) + row.line);
  });
  if (shown.length > 80) {
    shown = shown.slice(0, 80);
    shown.push("... diff truncated");
  }
  return ["--- " + rel, "+++ " + rel + " (generate-site.js)"].concat(shown).join("\n");
}

function firstMismatch(a, b) {
  var n = Math.max(a.length, b.length);
  for (var i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      return "first difference at line " + (i + 1) + "\n- " + (a[i] === undefined ? "(none)" : a[i]) + "\n+ " + (b[i] === undefined ? "(none)" : b[i]);
    }
  }
  return "contents differ";
}

function lcsRows(a, b) {
  var n = a.length;
  var m = b.length;
  var dp = new Array(n + 1);
  for (var i = 0; i <= n; i++) dp[i] = new Uint32Array(m + 1);
  for (i = n - 1; i >= 0; i--) {
    for (var j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  var rows = [];
  i = 0;
  j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ kind: " ", line: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ kind: "-", line: a[i] });
      i += 1;
    } else {
      rows.push({ kind: "+", line: b[j] });
      j += 1;
    }
  }
  while (i < n) rows.push({ kind: "-", line: a[i++] });
  while (j < m) rows.push({ kind: "+", line: b[j++] });
  return rows;
}

function maskNonMarkup(html) {
  var out = html.replace(/<!--[\s\S]*?-->/g, blankKeepLines);
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, function (match) {
    var openEnd = match.indexOf(">") + 1;
    return match.slice(0, openEnd) + blankKeepLines(match.slice(openEnd));
  });
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, function (match) {
    var openEnd = match.indexOf(">") + 1;
    return match.slice(0, openEnd) + blankKeepLines(match.slice(openEnd));
  });
  return out;
}

function blankKeepLines(value) {
  return value.replace(/[^\n]/g, " ");
}

function eachTag(html, fn) {
  var re = /<([A-Za-z][\w:-]*)(\s[^<>]*)?>/g;
  var match;
  while ((match = re.exec(html))) {
    fn(match[1].toLowerCase(), parseAttrs(match[2] || ""), match.index);
  }
}

function tagsIn(html, name) {
  var found = [];
  eachTag(html, function (tag, attrs) {
    if (tag === name) found.push({ attrs: attrs });
  });
  return found;
}

function parseAttrs(raw) {
  var attrs = {};
  var re = /([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  var match;
  while ((match = re.exec(raw))) {
    var key = match[1].toLowerCase();
    var value = match[2];
    if (value === undefined) value = match[3];
    if (value === undefined) value = match[4];
    if (value === undefined) value = "";
    attrs[key] = decodeEntities(value);
  }
  return attrs;
}

function normRel(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, function (_all, n) { return String.fromCharCode(Number(n)); })
    .replace(/&#x([0-9a-f]+);/gi, function (_all, n) { return String.fromCharCode(parseInt(n, 16)); });
}

function readText(abs) {
  var text = fs.readFileSync(abs, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return text;
}

function lineOf(text, index) {
  var line = 1;
  var end = Math.min(index, text.length);
  for (var i = 0; i < end; i++) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

function clip(value) {
  var text = String(value).replace(/\s+/g, " ");
  return text.length > 180 ? text.slice(0, 177) + "..." : text;
}

function summarizeProcessOutput(output) {
  if (!output) return "";
  var lines = output.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
  var thrown = lines.filter(function (line) {
    return /^(Error|TypeError|SyntaxError|ReferenceError|RangeError):/.test(line);
  });
  if (thrown.length) return thrown.join("; ");
  return clipBlock(output);
}

function clipBlock(value) {
  return value.length > 4000 ? value.slice(0, 4000) + "\n... truncated" : value;
}

function formatMs(ms) {
  if (ms < 1000) return Math.max(1, Math.round(ms)) + "ms";
  return (ms / 1000).toFixed(2) + "s";
}

function reportFailures(problems, elapsedMs) {
  var order = ["Links", "Pages", "Registry", "JSON-LD", "Generator"];
  console.error("QA failed in " + formatMs(elapsedMs) + " (" + problems.length + " problem" + (problems.length === 1 ? "" : "s") + ")");
  order.forEach(function (group) {
    var items = problems.filter(function (item) { return item.group === group; });
    if (!items.length) return;
    console.error("");
    console.error(group);
    items.forEach(function (item) {
      item.message.split("\n").forEach(function (line) {
        console.error("  " + line);
      });
    });
  });
}

main();
