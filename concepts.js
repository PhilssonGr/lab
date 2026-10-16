/* Shared behavior. No network calls. */
(function () {
  "use strict";

  var CAP = 100;
  var CHIP_LIMIT = 400;
  var PROGRESS_KEY = "bf-concepts-opened";
  var SVG_NS = "http://www.w3.org/2000/svg";

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

  function approximateTokens(text, slice) {
    var size = slice || 4;
    var re = /\s+|[A-Za-z]+(?:'[A-Za-z]+)?|\d+|[^\s]/g;
    var raw = text.match(re) || [];
    var out = [];
    raw.forEach(function (piece) {
      if (/^\s+$/.test(piece)) {
        out.push({ kind: "space", text: spaceLabel(piece) });
        return;
      }
      if (piece.length <= size) {
        out.push({ kind: "text", text: piece });
        return;
      }
      for (var i = 0; i < piece.length; i += size) {
        out.push({ kind: "text", text: piece.slice(i, i + size) });
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
    var chars = root.querySelector("[data-char-count]");
    var chips = root.querySelector("[data-token-chips]");
    var note = root.querySelector("[data-token-note]");
    var sliceButtons = root.querySelectorAll("[data-slice]");
    if (!input || !count || !chips) return;
    var slice = 4;

    function draw() {
      var tokens = approximateTokens(input.value, slice);
      count.textContent = String(tokens.length);
      if (chars) chars.textContent = String(input.value.length);
      chips.replaceChildren();
      var shown = tokens.slice(0, CHIP_LIMIT);
      shown.forEach(function (token, index) {
        var cls = token.kind === "space" ? "chip space" : "chip tone-" + (index % 4);
        chips.appendChild(el("span", cls, token.text));
      });
      if (note) {
        if (!tokens.length) note.textContent = "Type something to see chips.";
        else if (tokens.length > CHIP_LIMIT) note.textContent = "Showing the first " + CHIP_LIMIT + " chips. The count above includes the rest.";
        else note.textContent = "Each chip is one approximate token in this illustration.";
      }
    }

    sliceButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        slice = Number(btn.getAttribute("data-slice")) || 4;
        sliceButtons.forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        draw();
      });
    });

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
    var cards = askCards().map(function (card) {
      var score = hits(words, card.keys);
      var title = card.title.toLowerCase();
      words.forEach(function (word) {
        if (title.indexOf(word) !== -1) score += 5;
      });
      return { card: card, score: score };
    }).filter(function (row) { return row.score > 0; });
    cards.sort(function (a, b) { return b.score - a.score; });
    var soon = askSoon().filter(function (item) { return hits(words, item.keys) > 0; });
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
        results.appendChild(el("p", "fine", "Type a question. This matches words on the curriculum, such as token, context window, or prompt."));
        return;
      }
      if (!found.cards.length && !found.soon.length) {
        results.appendChild(el("p", null, "No concept matches those words."));
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
        note.textContent = item.title + " is on the " + item.track + " track. There is no card yet.";
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

  function registry() {
    if (typeof BF_CONCEPTS === "undefined" || !BF_CONCEPTS || !BF_CONCEPTS.length) return [];
    return BF_CONCEPTS;
  }

  function byId(id) {
    var all = registry();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  function trackNames() {
    var names = [];
    registry().forEach(function (concept) {
      if (names.indexOf(concept.track) === -1) names.push(concept.track);
    });
    return names;
  }

  function inTrack(track) {
    return registry().filter(function (concept) { return concept.track === track; });
  }

  function liveConcepts() {
    return registry().filter(function (concept) { return concept.status === "live"; });
  }

  function hrefOf(concept) {
    return concept.status === "live" ? "/" + concept.id : "";
  }

  function indexInTrack(concept) {
    var list = inTrack(concept.track);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === concept.id) return i + 1;
    }
    return 0;
  }

  function dependents(id) {
    return registry().filter(function (concept) {
      return concept.prerequisites && concept.prerequisites.indexOf(id) !== -1;
    });
  }

  function keysOf(concept) {
    return concept.keys || [];
  }

  function askCards() {
    return liveConcepts().map(function (concept) {
      return {
        title: concept.title,
        href: hrefOf(concept),
        track: concept.track,
        blurb: concept.summary,
        keys: keysOf(concept)
      };
    });
  }

  function askSoon() {
    return registry().filter(function (concept) { return concept.status !== "live"; }).map(function (concept) {
      return { title: concept.title, track: concept.track, keys: keysOf(concept) };
    });
  }

  function emptyProgress() {
    var data = {};
    liveConcepts().forEach(function (concept) { data[concept.id] = false; });
    return data;
  }

  function readProgress() {
    var data = emptyProgress();
    try {
      var raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return data;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return data;
      liveConcepts().forEach(function (concept) {
        data[concept.id] = parsed[concept.id] === true;
      });
    } catch (err) {
      return emptyProgress();
    }
    return data;
  }

  function writeProgress(data) {
    var out = emptyProgress();
    liveConcepts().forEach(function (concept) {
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
    return liveConcepts().some(function (concept) { return data[concept.id]; });
  }

  function openedCount(data) {
    return liveConcepts().filter(function (concept) { return data[concept.id]; }).length;
  }

  function isUnlocked(concept, data) {
    var pres = concept.prerequisites || [];
    for (var i = 0; i < pres.length; i++) {
      var pre = byId(pres[i]);
      if (!pre || pre.status !== "live" || data[pre.id] !== true) return false;
    }
    return true;
  }

  function classify(concept, data) {
    if (concept.status === "live" && data[concept.id] === true) return "visited";
    if (isUnlocked(concept, data)) return "next";
    return "locked";
  }

  function stateLabel(concept, kind) {
    if (kind === "visited") return "Visited";
    if (kind === "next") return "Next";
    if (concept.status === "live") return "Not opened";
    return "Coming soon";
  }

  function markVisit() {
    var id = document.body.getAttribute("data-concept");
    if (!id) return;
    var concept = byId(id);
    if (!concept || concept.status !== "live") return;
    var data = readProgress();
    if (data[id]) return;
    data[id] = true;
    writeProgress(data);
  }

  function conceptAnchor(concept) {
    if (concept.status === "live") {
      var link = el("a", null, concept.title);
      link.href = hrefOf(concept);
      return link;
    }
    return el("span", "is-muted", concept.title);
  }

  function fillConceptList(box, concepts, data, markNext) {
    box.replaceChildren();
    if (!concepts.length) {
      box.appendChild(el("p", "fine", "None yet."));
      return;
    }
    var list = el("ul", "side-links");
    concepts.forEach(function (concept) {
      var item = el("li");
      item.appendChild(conceptAnchor(concept));
      if (markNext && data && classify(concept, data) === "next") {
        item.appendChild(el("span", "side-tag", "next"));
      } else if (concept.status !== "live") {
        item.appendChild(el("span", "side-tag", "Soon"));
      }
      list.appendChild(item);
    });
    box.appendChild(list);
  }

  function initCard() {
    var id = document.body.getAttribute("data-concept");
    if (!id || !registry().length) return;
    var concept = byId(id);
    if (!concept) return;
    var data = readProgress();

    var summary = document.querySelector("[data-summary]");
    if (summary && concept.summary) summary.textContent = concept.summary;

    var checked = document.querySelector("[data-last-checked]");
    if (checked) {
      checked.textContent = concept.lastChecked ? "Last checked " + concept.lastChecked : "Not checked yet";
    }

    var accessEl = document.querySelector("[data-access]");
    if (accessEl && concept.access) {
      var accessLabel = { free: "Free card", pack: "Pack", "all-access": "All-access" };
      accessEl.textContent = accessLabel[concept.access] || concept.access;
    }

    var crumb = document.querySelector("[data-crumb-index]");
    if (crumb) {
      var n = indexInTrack(concept);
      crumb.textContent = (n < 10 ? "0" : "") + n;
    }

    var prereqBox = document.querySelector("[data-prereqs]");
    if (prereqBox) {
      var pres = (concept.prerequisites || []).map(byId).filter(Boolean);
      if (!pres.length) {
        prereqBox.replaceChildren();
        prereqBox.appendChild(el("p", "fine", "None. This is a starting card."));
      } else {
        fillConceptList(prereqBox, pres, data, false);
      }
    }

    var relatedBox = document.querySelector("[data-related]");
    if (relatedBox) {
      var rel = dependents(id);
      if (!rel.length) {
        relatedBox.replaceChildren();
        relatedBox.appendChild(el("p", "fine", "Nothing lists this card as a prerequisite yet."));
      } else {
        fillConceptList(relatedBox, rel, data, true);
      }
    }
  }

  function initQuiz(root) {
    var buttons = root.querySelectorAll("[data-choice]");
    var note = root.querySelector("[data-quiz-note]");
    if (!buttons.length) return;
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var correct = btn.getAttribute("data-correct") === "true";
        buttons.forEach(function (b) {
          b.classList.remove("is-correct", "is-wrong");
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        btn.classList.add(correct ? "is-correct" : "is-wrong");
        if (!note) return;
        if (correct) note.textContent = root.getAttribute("data-note-right") || "That's the one.";
        else note.textContent = root.getAttribute("data-note-wrong") || "Not this one.";
      });
    });
  }

  function renderNext(root, data) {
    var body = root.querySelector("[data-next-body]");
    if (!body || !registry().length) return;
    var pending = liveConcepts().filter(function (concept) { return !data[concept.id]; });
    var unlocked = pending.filter(function (concept) { return isUnlocked(concept, data); });
    var pool = unlocked.length ? unlocked : pending;
    body.replaceChildren();
    if (pool.length) {
      var showing = pool.slice(0, 2);
      var message;
      if (showing.length === 1 && openedCount(data) === 0) message = "Start with this card.";
      else if (showing.length === 1) message = "Next unopened card.";
      else message = "These two are next.";
      body.appendChild(el("p", "fine", message));
      var list = el("div", "next-list");
      showing.forEach(function (concept) {
        var link = el("a", "next-card");
        link.href = hrefOf(concept);
        link.appendChild(el("span", null, concept.track));
        link.appendChild(el("strong", null, concept.title));
        list.appendChild(link);
      });
      body.appendChild(list);
      return;
    }
    var liveN = liveConcepts().length;
    body.appendChild(el("p", "fine", "All " + liveN + " live cards are opened in this browser."));
    var upcoming = registry().filter(function (concept) {
      return concept.status !== "live" && classify(concept, data) === "next";
    }).slice(0, 2);
    if (!upcoming.length) return;
    body.appendChild(el("p", "fine", "Next on the map, still without a card:"));
    var soonList = el("div", "next-list");
    upcoming.forEach(function (concept) {
      var card = el("div", "next-card is-static");
      card.appendChild(el("span", null, concept.track));
      card.appendChild(el("strong", null, concept.title));
      card.appendChild(el("em", null, "Coming soon"));
      soonList.appendChild(card);
    });
    body.appendChild(soonList);
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

  function renderLiveCards(scope) {
    var grid = scope.querySelector("[data-live-cards]");
    if (!grid || !registry().length) return;
    grid.replaceChildren();
    liveConcepts().forEach(function (concept) {
      var link = el("a", "feature");
      link.href = hrefOf(concept);
      link.appendChild(el("span", null, concept.track));
      link.appendChild(el("strong", null, concept.title));
      link.appendChild(el("p", null, concept.summary));
      grid.appendChild(link);
    });
  }

  function renderTrackBoard(scope) {
    var board = scope.querySelector("[data-track-board]");
    if (!board || !registry().length) return;
    board.replaceChildren();
    trackNames().forEach(function (track) {
      var col = el("section", "track-col");
      col.appendChild(el("h2", null, track));
      var trackMeta = null;
      if (typeof BF_SITE !== "undefined" && BF_SITE.tracks) {
        for (var t = 0; t < BF_SITE.tracks.length; t++) {
          if (BF_SITE.tracks[t].name === track) trackMeta = BF_SITE.tracks[t];
        }
      }
      if (trackMeta) {
        var hub = el("a", "track-hub", "Track page");
        hub.href = "/tracks/" + trackMeta.slug;
        col.appendChild(hub);
      }
      inTrack(track).forEach(function (concept) {
        if (concept.status === "live") {
          var link = el("a", "node", concept.title);
          link.href = hrefOf(concept);
          col.appendChild(link);
        } else {
          var item = el("p", "node is-soon");
          item.appendChild(document.createTextNode(concept.title + " "));
          item.appendChild(el("small", null, "Coming soon"));
          col.appendChild(item);
        }
      });
      board.appendChild(col);
    });
  }

  function renderCurriculum(board) {
    board.replaceChildren();
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "cmap-edges");
    svg.setAttribute("data-map-edges", "");
    svg.setAttribute("aria-hidden", "true");
    board.appendChild(svg);

    var cols = el("div", "cmap-cols");
    trackNames().forEach(function (track, index) {
      var col = el("section", "cmap-col");
      var num = String(index + 1);
      if (num.length < 2) num = "0" + num;
      col.appendChild(el("h2", "cmap-label", num + " · " + track));
      inTrack(track).forEach(function (concept) {
        var node;
        if (concept.status === "live") {
          node = el("a", "cnode");
          node.href = hrefOf(concept);
        } else {
          node = el("div", "cnode is-soon");
          node.title = "Coming soon. This is not a link.";
        }
        node.setAttribute("data-node", concept.id);
        node.appendChild(el("strong", null, concept.title));
        node.appendChild(el("span", "cnode-state", ""));
        col.appendChild(node);
      });
      cols.appendChild(col);
    });
    board.appendChild(cols);
  }

  function applyCurriculumState(board, data) {
    board.querySelectorAll("[data-node]").forEach(function (node) {
      var concept = byId(node.getAttribute("data-node"));
      if (!concept) return;
      var kind = classify(concept, data);
      node.classList.toggle("is-opened", kind === "visited");
      node.classList.toggle("is-next", kind === "next");
      node.classList.toggle("is-locked", kind === "locked");
      var state = node.querySelector(".cnode-state");
      if (state) state.textContent = stateLabel(concept, kind);
    });
  }

  function renderRelList(list) {
    list.replaceChildren();
    registry().forEach(function (concept) {
      (concept.prerequisites || []).forEach(function (pid) {
        var pre = byId(pid);
        if (!pre) return;
        list.appendChild(el("li", null, concept.title + " requires " + pre.title + "."));
      });
    });
  }

  function initMap(root) {
    var board = root.querySelector("[data-map-board]");
    var count = root.querySelector("[data-progress-count]");
    var reset = root.querySelector("[data-reset-progress]");
    var rel = root.querySelector("[data-rel-list]");
    var title = document.querySelector("[data-map-title]");
    if (!board || !registry().length) return;

    if (title) {
      var words = ["zero", "one", "two", "three", "four", "five", "six"];
      var nTracks = trackNames().length;
      var word = words[nTracks] || String(nTracks);
      title.textContent = registry().length + " concepts, " + word + " tracks";
    }

    renderCurriculum(board);
    if (rel) renderRelList(rel);

    var hot = null;
    var frame = 0;
    var ready = false;

    function paint(prefix) {
      var data = readProgress();
      var opened = openedCount(data);
      var liveN = liveConcepts().length;
      var nextN = 0;
      var lockedN = 0;
      registry().forEach(function (concept) {
        var kind = classify(concept, data);
        if (kind === "next") nextN++;
        else if (kind === "locked") lockedN++;
      });
      if (count) {
        var text = "Visited " + opened + " of " + liveN + " · Next " + nextN + " · Locked " + lockedN;
        count.textContent = prefix ? prefix + " " + text : text;
      }
      if (reset) reset.disabled = !anyOpened(data);
      applyCurriculumState(board, data);
      return data;
    }

    function marker(defs, id, color) {
      var mark = document.createElementNS(SVG_NS, "marker");
      mark.setAttribute("id", id);
      mark.setAttribute("viewBox", "0 0 8 8");
      mark.setAttribute("refX", "7");
      mark.setAttribute("refY", "4");
      mark.setAttribute("markerWidth", "6");
      mark.setAttribute("markerHeight", "6");
      mark.setAttribute("orient", "auto");
      var head = document.createElementNS(SVG_NS, "path");
      head.setAttribute("d", "M0,0 L8,4 L0,8 z");
      head.setAttribute("fill", color);
      mark.appendChild(head);
      defs.appendChild(mark);
    }

    function draw() {
      var svg = board.querySelector("[data-map-edges]");
      if (!svg) return false;
      var width = board.clientWidth;
      var height = board.clientHeight;
      if (!width || !height) return false;
      var origin = board.getBoundingClientRect();
      var boxes = {};
      board.querySelectorAll("[data-node]").forEach(function (node) {
        var rect = node.getBoundingClientRect();
        boxes[node.getAttribute("data-node")] = {
          x: rect.left - origin.left,
          y: rect.top - origin.top,
          w: rect.width,
          h: rect.height
        };
      });

      svg.setAttribute("viewBox", "0 0 " + width + " " + height);
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      svg.replaceChildren();
      var defs = document.createElementNS(SVG_NS, "defs");
      marker(defs, "arrow", "#8a7350");
      marker(defs, "arrow-lit", "#ff8a45");
      svg.appendChild(defs);

      var data = readProgress();

      function verticalBlocked(x, y1, y2, idA, idB) {
        var top = Math.min(y1, y2) + 2;
        var bot = Math.max(y1, y2) - 2;
        var blocked = false;
        Object.keys(boxes).forEach(function (id) {
          if (blocked || id === idA || id === idB) return;
          var box = boxes[id];
          if (Math.abs(box.x + box.w / 2 - x) > 24) return;
          if (box.y < bot && box.y + box.h > top) blocked = true;
        });
        return blocked;
      }

      registry().forEach(function (concept) {
        (concept.prerequisites || []).forEach(function (pid) {
          var a = boxes[pid];
          var b = boxes[concept.id];
          if (!a || !b) return;
          var lit = data[pid] === true;
          var same = Math.abs((a.x + a.w / 2) - (b.x + b.w / 2)) < Math.min(a.w, b.w) * 0.45;
          var d;
          if (same) {
            var x = a.x + a.w / 2;
            var yStart = a.y + a.h;
            var yEnd = b.y;
            if (b.y < a.y) {
              yStart = a.y;
              yEnd = b.y + b.h;
            }
            if (verticalBlocked(x, yStart, yEnd, pid, concept.id)) {
              var gx = Math.max(8, Math.min(a.x, b.x) - 8);
              var yA = a.y + a.h / 2;
              var yB = b.y + b.h / 2;
              d = "M " + a.x.toFixed(1) + " " + yA.toFixed(1) +
                " L " + gx.toFixed(1) + " " + yA.toFixed(1) +
                " L " + gx.toFixed(1) + " " + yB.toFixed(1) +
                " L " + b.x.toFixed(1) + " " + yB.toFixed(1);
            } else if (b.y >= a.y) {
              d = "M " + x.toFixed(1) + " " + (a.y + a.h).toFixed(1) + " L " + x.toFixed(1) + " " + b.y.toFixed(1);
            } else {
              d = "M " + x.toFixed(1) + " " + a.y.toFixed(1) + " L " + x.toFixed(1) + " " + (b.y + b.h).toFixed(1);
            }
          } else {
            var aOnLeft = (a.x + a.w / 2) <= (b.x + b.w / 2);
            var p1 = aOnLeft
              ? { x: a.x + a.w, y: a.y + a.h / 2 }
              : { x: a.x, y: a.y + a.h / 2 };
            var p2 = aOnLeft
              ? { x: b.x, y: b.y + b.h / 2 }
              : { x: b.x + b.w, y: b.y + b.h / 2 };
            var mid = (p1.x + p2.x) / 2;
            d = "M " + p1.x.toFixed(1) + " " + p1.y.toFixed(1) +
              " C " + mid.toFixed(1) + " " + p1.y.toFixed(1) +
              " " + mid.toFixed(1) + " " + p2.y.toFixed(1) +
              " " + p2.x.toFixed(1) + " " + p2.y.toFixed(1);
          }
          var path = document.createElementNS(SVG_NS, "path");
          var classes = "cedge" + (lit ? " is-lit" : "");
          if (hot && (hot === pid || hot === concept.id)) classes += " is-hot";
          path.setAttribute("class", classes);
          path.setAttribute("data-a", pid);
          path.setAttribute("data-b", concept.id);
          path.setAttribute("d", d);
          path.setAttribute("marker-end", lit ? "url(#arrow-lit)" : "url(#arrow)");
          svg.appendChild(path);
        });
      });
      return true;
    }

    function schedule() {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        frame = 0;
        draw();
      });
    }

    function highlight(id) {
      hot = id;
      var svg = board.querySelector("[data-map-edges]");
      if (!svg) return;
      svg.querySelectorAll("path").forEach(function (path) {
        var on = id && (path.getAttribute("data-a") === id || path.getAttribute("data-b") === id);
        path.classList.toggle("is-hot", !!on);
      });
    }

    board.querySelectorAll("[data-node]").forEach(function (node) {
      var id = node.getAttribute("data-node");
      node.addEventListener("mouseenter", function () { highlight(id); });
      node.addEventListener("mouseleave", function () { highlight(null); });
      node.addEventListener("focus", function () { highlight(id); });
      node.addEventListener("blur", function () { highlight(null); });
    });

    if (reset) {
      reset.addEventListener("click", function () {
        clearProgress();
        paint("Progress reset.");
        schedule();
      });
    }

    window.addEventListener("storage", function (event) {
      if (event.key !== PROGRESS_KEY) return;
      paint();
      schedule();
    });

    window.addEventListener("pageshow", function (event) {
      if (!event.persisted) return;
      paint();
      schedule();
    });

    if (window.ResizeObserver) {
      var observer = new ResizeObserver(function () {
        if (ready) schedule();
      });
      observer.observe(board);
    } else {
      window.addEventListener("resize", function () {
        if (ready) schedule();
      });
    }

    paint();
    schedule();
    window.addEventListener("load", function () { draw(); });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        ready = true;
        draw();
      });
    });
  }

  onReady(function () {
    markVisit();
    initCard();
    renderLiveCards(document);
    renderTrackBoard(document);
    document.querySelectorAll("[data-tabs]").forEach(initTabs);
    document.querySelectorAll("[data-quiz]").forEach(initQuiz);
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

