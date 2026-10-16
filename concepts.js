/* Shared behavior. No network calls. */
(function () {
  "use strict";

  var CAP = 100;
  var CHIP_LIMIT = 400;

  var CARDS = [
    {
      title: "Tokens",
      href: "/tokens",
      track: "Foundations",
      blurb: "A token is a piece of text the model reads or writes. Bills and limits count tokens.",
      keys: ["token", "tokens", "tokenizer", "tokenize", "tokenization", "billing", "bill", "cost", "price", "chunk", "chunks", "split", "character", "characters", "word", "words", "tiktoken", "bpe", "subword", "approximate", "budget", "spend", "piece"]
    },
    {
      title: "Context Window",
      href: "/context-window",
      track: "Foundations",
      blurb: "The fixed text one request can hold: instructions, history, documents, and the answer.",
      keys: ["context", "window", "windows", "limit", "limits", "history", "chat", "thread", "document", "documents", "overflow", "cut", "cuts", "truncated", "truncation", "forgotten", "forget", "older", "system", "memory"]
    },
    {
      title: "Prompting",
      href: "/prompting",
      track: "Foundations",
      blurb: "How you state the task this turn: reader, format, and what to leave out.",
      keys: ["prompt", "prompts", "prompting", "instruction", "instructions", "weak", "strong", "format", "constraint", "constraints", "rewrite", "reader", "vague", "specific", "summarize", "summary"]
    }
  ];

  var SOON = [
    { name: "Temperature", track: "Foundations", keys: ["temperature", "sampling"] },
    { name: "Embeddings", track: "Retrieval & Grounding", keys: ["embedding", "embeddings", "vector", "vectors"] },
    { name: "RAG", track: "Retrieval & Grounding", keys: ["rag", "retrieval", "grounding"] },
    { name: "Evaluation", track: "Ship & Maintain", keys: ["evaluation", "eval", "evals", "evaluate"] },
    { name: "Agents", track: "Agents", keys: ["agent", "agents"] }
  ];

  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function initTabs(root) {
    var buttons = root.querySelectorAll("[data-tab]");
    var panels = root.querySelectorAll("[data-panel]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-tab");
        buttons.forEach(function (b) {
          var on = b === btn;
          b.setAttribute("aria-selected", on ? "true" : "false");
          b.tabIndex = on ? 0 : -1;
        });
        panels.forEach(function (panel) {
          panel.hidden = panel.getAttribute("data-panel") !== id;
        });
      });
    });
  }

  function approximateTokens(text) {
    var re = /\s+|[A-Za-z]+(?:'[A-Za-z]+)?|\d+|[^\s]/g;
    var raw = text.match(re) || [];
    var out = [];
    raw.forEach(function (piece) {
      if (/^\s+$/.test(piece)) {
        out.push({ kind: "space", text: spaceLabel(piece) });
        return;
      }
      if (piece.length <= 4) {
        out.push({ kind: "text", text: piece });
        return;
      }
      for (var i = 0; i < piece.length; i += 4) {
        out.push({ kind: "text", text: piece.slice(i, i + 4) });
      }
    });
    return out;
  }

  function spaceLabel(s) {
    if (s.indexOf("\n") !== -1) return "line break";
    if (s.indexOf("\t") !== -1) return "tab";
    return "space";
  }

  function initTokens(root) {
    var input = root.querySelector("textarea");
    var count = root.querySelector("[data-token-count]");
    var chips = root.querySelector("[data-token-chips]");
    var note = root.querySelector("[data-token-note]");
    if (!input || !count || !chips) return;

    function draw() {
      var tokens = approximateTokens(input.value);
      count.textContent = String(tokens.length);
      chips.replaceChildren();
      var shown = tokens.slice(0, CHIP_LIMIT);
      shown.forEach(function (token) {
        chips.appendChild(el("span", token.kind === "space" ? "chip space" : "chip", token.text));
      });
      if (note) {
        if (!tokens.length) note.textContent = "Type something to see chips.";
        else if (tokens.length > CHIP_LIMIT) note.textContent = "Showing the first " + CHIP_LIMIT + " chips. The count above includes the rest.";
        else note.textContent = "Each chip is one approximate token.";
      }
    }

    input.addEventListener("input", draw);
    draw();
  }

  function initContext(root) {
    var meter = root.querySelector("[data-meter]");
    var cut = root.querySelector("[data-cut]");
    var inputs = root.querySelectorAll("input[type='range']");
    if (!meter || !cut || !inputs.length) return;

    var order = ["system", "history", "documents", "answer"];
    var cutLine = {
      system: "System prompt: the instruction itself does not fit.",
      history: "History: left out from the older end.",
      documents: "Documents: left out from the end.",
      answer: "Answer: the reply runs out of room."
    };

    function valueOf(name) {
      var input = root.querySelector("[data-part='" + name + "']");
      var n = input ? Number(input.value) : 0;
      if (!isFinite(n) || n < 0) return 0;
      return Math.round(n);
    }

    function draw() {
      var want = {};
      var kept = {};
      var dropped = {};
      var remain = CAP;
      var total = 0;
      order.forEach(function (name) {
        want[name] = valueOf(name);
        total += want[name];
        var keep = Math.min(want[name], remain);
        kept[name] = keep;
        dropped[name] = want[name] - keep;
        remain -= keep;
        var readout = root.querySelector("[data-readout='" + name + "']");
        if (readout) readout.textContent = String(want[name]);
      });

      meter.replaceChildren();
      order.forEach(function (name) {
        if (!kept[name]) return;
        var seg = el("div", "seg " + name);
        seg.style.width = (kept[name] / CAP * 100) + "%";
        seg.title = name + " " + kept[name];
        meter.appendChild(seg);
      });

      cut.replaceChildren();
      var any = order.some(function (name) { return dropped[name] > 0; });
      if (!any) {
        var ok = el("p", "ok");
        ok.textContent = total === 0
          ? "The window is empty."
          : "Nothing is left out. These pieces fit, with " + remain + " still open.";
        cut.appendChild(ok);
        return;
      }
      var lead = el("p");
      lead.textContent = "Left out of this " + CAP + "-unit window:";
      cut.appendChild(lead);
      order.forEach(function (name) {
        if (!dropped[name]) return;
        var line = el("p");
        line.textContent = dropped[name] + " " + name + ". " + cutLine[name];
        cut.appendChild(line);
      });
    }

    inputs.forEach(function (input) {
      input.addEventListener("input", draw);
    });
    draw();
  }

  function initPrompt(root) {
    var buttons = root.querySelectorAll("[data-set]");
    var views = root.querySelectorAll("[data-show]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var state = btn.getAttribute("data-set");
        root.setAttribute("data-state", state);
        buttons.forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        views.forEach(function (view) {
          view.hidden = view.getAttribute("data-show") !== state;
        });
      });
    });
  }

  function wordsOf(query) {
    return query.toLowerCase().split(/[^a-z0-9+]+/).filter(function (word) {
      return word.length > 1 && ["the", "a", "an", "of", "to", "and", "it", "is", "for", "in", "on", "my", "how", "do", "does", "what", "why", "when", "this", "that", "with", "from"].indexOf(word) === -1;
    });
  }

  function hits(words, keys) {
    var score = 0;
    words.forEach(function (word) {
      keys.forEach(function (key) {
        if (key === word) score += 4;
        else if (key.indexOf(word) !== -1 || word.indexOf(key) !== -1) score += 2;
      });
    });
    return score;
  }

  function matchCards(query) {
    var words = wordsOf(query);
    if (!words.length) return { cards: [], soon: [], empty: true };
    var cards = CARDS.map(function (card) {
      var score = hits(words, card.keys);
      var title = card.title.toLowerCase();
      words.forEach(function (word) {
        if (title.indexOf(word) !== -1) score += 5;
      });
      return { card: card, score: score };
    }).filter(function (row) { return row.score > 0; });
    cards.sort(function (a, b) { return b.score - a.score; });
    var soon = SOON.filter(function (item) { return hits(words, item.keys) > 0; });
    return { cards: cards, soon: soon, empty: false };
  }

  function initAsk(root) {
    var input = root.querySelector("input[name='q']");
    var results = root.querySelector("[data-results]");
    if (!input || !results) return;

    function show(query) {
      var found = matchCards(query);
      results.replaceChildren();
      if (found.empty) {
        results.appendChild(el("p", "fine", "Type a question. This matches words such as token, context window, or prompt."));
        return;
      }
      if (!found.cards.length && !found.soon.length) {
        results.appendChild(el("p", null, "No card matches those words. Only Tokens, Context Window, and Prompting are written."));
        return;
      }
      found.cards.forEach(function (row) {
        var link = el("a", "result");
        link.href = row.card.href;
        link.appendChild(el("em", null, row.card.track));
        link.appendChild(el("strong", null, row.card.title));
        var blurb = el("p", "fine", row.card.blurb);
        blurb.style.margin = "0.35rem 0 0";
        link.appendChild(blurb);
        results.appendChild(link);
      });
      found.soon.forEach(function (item) {
        var note = el("p", "soon-note");
        note.textContent = item.name + " is on the " + item.track + " track. There is no card yet.";
        results.appendChild(note);
      });
    }

    function params() {
      return new URLSearchParams(window.location.search);
    }

    var initial = params().get("q") || "";
    input.value = initial;
    show(initial);

    root.addEventListener("submit", function (event) {
      event.preventDefault();
      var query = input.value.trim();
      var url = new URL(window.location.href);
      if (query) url.searchParams.set("q", query);
      else url.searchParams.delete("q");
      window.history.replaceState(null, "", url.pathname + url.search);
      show(query);
    });
  }

  var PROGRESS_KEY = "bf-concepts-opened";

  var CONCEPTS = [
    { id: "tokens", title: "Tokens", href: "/tokens" },
    { id: "context-window", title: "Context Window", href: "/context-window" },
    { id: "prompting", title: "Prompting", href: "/prompting" }
  ];

  var EDGES = [
    { a: "tokens", b: "context-window", label: "Limits count tokens" },
    { a: "tokens", b: "prompting", label: "A prompt is made of tokens" },
    { a: "context-window", b: "prompting", label: "The prompt sits in the window" }
  ];

  function emptyProgress() {
    return { tokens: false, "context-window": false, prompting: false };
  }

  function readProgress() {
    var data = emptyProgress();
    try {
      var raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return data;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return data;
      CONCEPTS.forEach(function (concept) {
        data[concept.id] = parsed[concept.id] === true;
      });
    } catch (err) {
      return emptyProgress();
    }
    return data;
  }

  function writeProgress(data) {
    var out = emptyProgress();
    CONCEPTS.forEach(function (concept) {
      out[concept.id] = data[concept.id] === true;
    });
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(out));
    } catch (err) {}
    return out;
  }

  function clearProgress() {
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch (err) {}
  }

  function anyOpened(data) {
    return CONCEPTS.some(function (concept) { return data[concept.id]; });
  }

  function openedCount(data) {
    return CONCEPTS.filter(function (concept) { return data[concept.id]; }).length;
  }

  function markVisit() {
    var id = document.body.getAttribute("data-concept");
    if (!id) return;
    var known = CONCEPTS.some(function (concept) { return concept.id === id; });
    if (!known) return;
    var data = readProgress();
    if (data[id]) return;
    data[id] = true;
    writeProgress(data);
  }

  function applyNodeState(scope, data) {
    scope.querySelectorAll("[data-node]").forEach(function (node) {
      var id = node.getAttribute("data-node");
      var opened = data[id] === true;
      node.classList.toggle("is-opened", opened);
      var state = node.querySelector(".map-node-state");
      if (state) state.textContent = opened ? "Opened" : "Not opened";
    });
  }

  function renderNext(root, data) {
    var body = root.querySelector("[data-next-body]");
    if (!body) return;
    var pending = CONCEPTS.filter(function (concept) { return !data[concept.id]; });
    body.replaceChildren();
    if (!pending.length) {
      body.appendChild(el("p", "fine", "All three Foundations cards are opened in this browser."));
      return;
    }
    var showing = pending.slice(0, 2);
    var message;
    if (showing.length === 1) message = "One Foundations card is still unopened.";
    else if (pending.length > 2) message = "Start with these two.";
    else message = "These two are still unopened.";
    body.appendChild(el("p", "fine", message));
    var list = el("div", "next-list");
    showing.forEach(function (concept) {
      var link = el("a", "next-card");
      link.href = concept.href;
      link.appendChild(el("span", null, "Foundations"));
      link.appendChild(el("strong", null, concept.title));
      list.appendChild(link);
    });
    body.appendChild(list);
  }

  function initNext(root) {
    renderNext(root, readProgress());
    window.addEventListener("storage", function (event) {
      if (event.key === PROGRESS_KEY) renderNext(root, readProgress());
    });
    window.addEventListener("pageshow", function (event) {
      if (event.persisted) renderNext(root, readProgress());
    });
  }

  function borderPoint(from, toward, box, gap) {
    var cx = box.x + box.w / 2;
    var cy = box.y + box.h / 2;
    var dx = toward.x - from.x;
    var dy = toward.y - from.y;
    if (!dx && !dy) return { x: cx, y: cy };
    var hw = box.w / 2 + gap;
    var hh = box.h / 2 + gap;
    var scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
    return { x: cx + dx * scale, y: cy + dy * scale };
  }

  function initMap(root) {
    var canvas = root.querySelector("[data-map-canvas]");
    var svg = root.querySelector("[data-map-edges]");
    var count = root.querySelector("[data-progress-count]");
    var reset = root.querySelector("[data-reset-progress]");
    if (!canvas || !svg) return;

    var ns = "http://www.w3.org/2000/svg";
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var narrowQuery = window.matchMedia("(max-width: 720px)");
    var animated = false;
    var hot = null;
    var frame = 0;
    var wantIntro = false;
    var ready = false;

    function paintCount(data, prefix) {
      if (!count) return;
      var n = openedCount(data);
      count.textContent = (prefix ? prefix + " " : "") + n + " of 3 opened";
    }

    function syncProgress() {
      var data = readProgress();
      applyNodeState(root, data);
      paintCount(data);
      if (reset) reset.disabled = !anyOpened(data);
      return data;
    }

    function draw(allowIntro) {
      var width = canvas.clientWidth;
      var height = canvas.clientHeight;
      if (!width || !height) return false;
      var origin = canvas.getBoundingClientRect();
      var boxes = {};
      var centers = {};
      canvas.querySelectorAll("[data-node]").forEach(function (node) {
        var id = node.getAttribute("data-node");
        var rect = node.getBoundingClientRect();
        boxes[id] = {
          x: rect.left - origin.left,
          y: rect.top - origin.top,
          w: rect.width,
          h: rect.height
        };
        centers[id] = {
          x: boxes[id].x + boxes[id].w / 2,
          y: boxes[id].y + boxes[id].h / 2
        };
      });

      var ids = Object.keys(centers);
      var centroid = { x: 0, y: 0 };
      ids.forEach(function (id) {
        centroid.x += centers[id].x;
        centroid.y += centers[id].y;
      });
      if (ids.length) {
        centroid.x /= ids.length;
        centroid.y /= ids.length;
      }

      svg.setAttribute("viewBox", "0 0 " + width + " " + height);
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      svg.replaceChildren();

      var showLabels = !narrowQuery.matches;
      EDGES.forEach(function (edge) {
        if (!boxes[edge.a] || !boxes[edge.b]) return;
        var p1 = borderPoint(centers[edge.a], centers[edge.b], boxes[edge.a], 12);
        var p2 = borderPoint(centers[edge.b], centers[edge.a], boxes[edge.b], 12);
        var path = document.createElementNS(ns, "path");
        var classes = "edge";
        if (hot === edge.a || hot === edge.b) classes += " is-hot";
        path.setAttribute("data-a", edge.a);
        path.setAttribute("data-b", edge.b);
        path.setAttribute("d", "M " + p1.x.toFixed(1) + " " + p1.y.toFixed(1) + " L " + p2.x.toFixed(1) + " " + p2.y.toFixed(1));
        svg.appendChild(path);
        if (allowIntro && !reduced) {
          var len = path.getTotalLength();
          path.style.setProperty("--len", String(len));
          classes += " is-draw";
        }
        path.setAttribute("class", classes);

        if (!showLabels) return;
        var mx = (p1.x + p2.x) / 2;
        var my = (p1.y + p2.y) / 2;
        var vx = mx - centroid.x;
        var vy = my - centroid.y;
        var vlen = Math.hypot(vx, vy) || 1;
        var half = Math.min(128, edge.label.length * 3.4);
        var labelH = 11;
        function place(sign) {
          var x = mx + sign * (vx / vlen) * 20;
          var y = my + sign * (vy / vlen) * 18;
          x = Math.max(half + 4, Math.min(width - half - 4, x));
          y = Math.max(labelH + 4, Math.min(height - labelH - 4, y));
          return { x: x, y: y };
        }
        function overlaps(point) {
          return ids.some(function (id) {
            var b = boxes[id];
            return point.x + half > b.x - 8 && point.x - half < b.x + b.w + 8 && point.y + labelH > b.y - 8 && point.y - labelH < b.y + b.h + 8;
          });
        }
        var spot = place(1);
        if (overlaps(spot)) spot = place(-1);
        if (overlaps(spot)) return;
        var lx = spot.x;
        var ly = spot.y;
        var text = document.createElementNS(ns, "text");
        text.setAttribute("class", "edge-label");
        text.setAttribute("x", lx.toFixed(1));
        text.setAttribute("y", ly.toFixed(1));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.textContent = edge.label;
        svg.appendChild(text);
      });

      if (allowIntro) animated = true;
      return true;
    }

    function schedule(intro) {
      if (intro) wantIntro = true;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        frame = 0;
        var introNow = wantIntro || !animated;
        wantIntro = false;
        draw(introNow && !reduced);
      });
    }

    function highlight(id) {
      hot = id;
      svg.querySelectorAll("path.edge").forEach(function (path) {
        var on = id && (path.getAttribute("data-a") === id || path.getAttribute("data-b") === id);
        path.classList.toggle("is-hot", !!on);
      });
    }

    canvas.querySelectorAll("[data-node]").forEach(function (node) {
      var id = node.getAttribute("data-node");
      node.addEventListener("mouseenter", function () { highlight(id); });
      node.addEventListener("mouseleave", function () { highlight(null); });
      node.addEventListener("focus", function () { highlight(id); });
      node.addEventListener("blur", function () { highlight(null); });
    });

    if (reset) {
      reset.addEventListener("click", function () {
        clearProgress();
        syncProgress();
        paintCount(readProgress(), "Progress reset.");
        draw(false);
      });
    }

    window.addEventListener("storage", function (event) {
      if (event.key !== PROGRESS_KEY) return;
      syncProgress();
      draw(false);
    });

    window.addEventListener("pageshow", function (event) {
      if (!event.persisted) return;
      syncProgress();
      draw(false);
    });

    if (window.ResizeObserver) {
      var observer = new ResizeObserver(function () {
        if (!ready) return;
        schedule(false);
      });
      observer.observe(canvas);
    } else {
      window.addEventListener("resize", function () {
        if (ready) schedule(false);
      });
    }

    if (narrowQuery.addEventListener) {
      narrowQuery.addEventListener("change", function () {
        if (ready) schedule(false);
      });
    }

    syncProgress();
    schedule(true);
    window.addEventListener("load", function () { draw(false); });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { ready = true; });
    });
  }

  onReady(function () {
    markVisit();
    document.querySelectorAll("[data-tabs]").forEach(initTabs);
    document.querySelectorAll("[data-widget='tokens']").forEach(initTokens);
    document.querySelectorAll("[data-widget='context']").forEach(initContext);
    document.querySelectorAll("[data-widget='prompt']").forEach(initPrompt);
    var ask = document.querySelector("[data-widget='ask']");
    if (ask) initAsk(ask);
    var map = document.querySelector("[data-widget='map']");
    if (map) initMap(map);
    var next = document.querySelector("[data-widget='next']");
    if (next) initNext(next);
  });
})();
