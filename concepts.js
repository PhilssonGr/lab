/* Shared behavior. No network calls. */
(function () {
  "use strict";

  var CAP = 100;
  var CHIP_LIMIT = 400;
  var PROGRESS_KEY = "bf-concepts-opened";
  var TRIED_KEY = "bf-concepts-tried";
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

  function escapeReg(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function textHits(words, text, exact, partial) {
    if (!text) return 0;
    var hay = String(text).toLowerCase();
    var score = 0;
    words.forEach(function (word) {
      var re = new RegExp("(^|[^a-z0-9])" + escapeReg(word) + "([^a-z0-9]|$)");
      if (re.test(hay)) score += exact;
      else if (hay.indexOf(word) !== -1) score += partial;
    });
    return score;
  }

  function cardText(id) {
    if (typeof BF_CARD_TEXT === "undefined" || !BF_CARD_TEXT) return "";
    return BF_CARD_TEXT[id] || "";
  }

  function scoreConcept(concept, words) {
    var score = textHits(words, concept.title, 8, 5);
    score += textHits(words, concept.summary, 5, 2);
    score += hits(words, concept.keys || []);
    if (concept.status === "live") score += textHits(words, cardText(concept.id), 3, 1);
    return score;
  }

  function matchCards(query) {
    var words = wordsOf(query);
    if (!words.length) return { cards: [], soon: [], empty: true };
    var cards = [];
    var soon = [];
    registry().forEach(function (concept, index) {
      var score = scoreConcept(concept, words);
      if (score <= 0) return;
      var row = { concept: concept, score: score, index: index };
      if (concept.status === "live") cards.push(row);
      else soon.push(row);
    });
    function byScore(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    }
    cards.sort(byScore);
    soon.sort(byScore);
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
        var concept = row.concept;
        var link = el("a", "result");
        link.href = hrefOf(concept);
        link.appendChild(el("em", null, concept.track + " · Live"));
        link.appendChild(el("strong", null, concept.title));
        var blurb = el("p", "fine", concept.summary);
        blurb.style.margin = "0.35rem 0 0";
        link.appendChild(blurb);
        results.appendChild(link);
      });
      found.soon.forEach(function (row) {
        var concept = row.concept;
        var note = el("div", "result is-soon");
        note.appendChild(el("em", null, concept.track + " · Coming soon"));
        note.appendChild(el("strong", null, concept.title));
        var blurb = el("p", "fine", concept.summary);
        blurb.style.margin = "0.35rem 0 0";
        note.appendChild(blurb);
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

  function emptyTried() {
    var data = {};
    liveConcepts().forEach(function (concept) { data[concept.id] = false; });
    return data;
  }

  function readTried() {
    var data = emptyTried();
    try {
      var raw = localStorage.getItem(TRIED_KEY);
      if (!raw) return data;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return data;
      liveConcepts().forEach(function (concept) {
        data[concept.id] = parsed[concept.id] === true;
      });
    } catch (err) {
      return emptyTried();
    }
    return data;
  }

  function writeTried(data) {
    var out = emptyTried();
    liveConcepts().forEach(function (concept) {
      out[concept.id] = data[concept.id] === true;
    });
    try {
      localStorage.setItem(TRIED_KEY, JSON.stringify(out));
    } catch (err) {}
    return out;
  }

  function clearTried() {
    try {
      localStorage.removeItem(TRIED_KEY);
    } catch (err) {}
  }

  function anyTried(data) {
    return liveConcepts().some(function (concept) { return data[concept.id]; });
  }

  function triedCount(data) {
    return liveConcepts().filter(function (concept) { return data[concept.id]; }).length;
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

  function stateLabel(concept, kind, tried) {
    if (tried) return "Tried";
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

  function conceptNode(concept) {
    var node;
    if (concept.status === "live") {
      node = el("a", "cnode is-live");
      node.href = hrefOf(concept);
    } else {
      node = el("div", "cnode is-soon");
      node.title = "Coming soon. This is not a link.";
    }
    node.setAttribute("data-node", concept.id);
    node.appendChild(el("strong", null, concept.title));
    node.appendChild(el("span", "cnode-summary", concept.summary || ""));
    node.appendChild(el("span", "cnode-state", ""));
    return node;
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
      col.setAttribute("data-track", track);
      var num = String(index + 1);
      if (num.length < 2) num = "0" + num;
      col.appendChild(el("h2", "cmap-label", num + " · " + track));
      var progress = el("p", "cmap-progress", "");
      progress.setAttribute("data-track-progress", track);
      col.appendChild(progress);
      var list = inTrack(track);
      var live = list.filter(function (concept) { return concept.status === "live"; });
      var soon = list.filter(function (concept) { return concept.status !== "live"; });
      function addGroup(name, key, items) {
        if (!items.length) return;
        var heading = el("p", "cmap-group", name);
        heading.setAttribute("data-group", key);
        col.appendChild(heading);
        items.forEach(function (concept) { col.appendChild(conceptNode(concept)); });
      }
      addGroup("Live", "live", live);
      addGroup("Coming soon", "soon", soon);
      cols.appendChild(col);
    });
    board.appendChild(cols);
  }

  function applyCurriculumState(board, data, tried) {
    board.querySelectorAll("[data-node]").forEach(function (node) {
      var concept = byId(node.getAttribute("data-node"));
      if (!concept) return;
      var kind = classify(concept, data);
      var didTry = !!(tried && tried[concept.id]);
      node.classList.toggle("is-live", concept.status === "live");
      node.classList.toggle("is-opened", kind === "visited");
      node.classList.toggle("is-tried", didTry);
      node.classList.toggle("is-next", kind === "next");
      node.classList.toggle("is-locked", kind === "locked");
      node.classList.toggle("is-soon", concept.status !== "live");
      var state = node.querySelector(".cnode-state");
      if (state) state.textContent = stateLabel(concept, kind, didTry);
    });
  }

  function trackProgressText(track, data, tried) {
    var list = inTrack(track);
    var opened = list.filter(function (concept) { return data[concept.id] === true; }).length;
    var liveN = list.filter(function (concept) { return concept.status === "live"; }).length;
    var triedN = list.filter(function (concept) { return tried[concept.id] === true; }).length;
    return opened + " of " + list.length + " opened · " + liveN + " live · " + triedN + " tried";
  }

  function renderRelList(list) {
    list.replaceChildren();
    registry().forEach(function (concept) {
      var pres = (concept.prerequisites || []).map(byId).filter(Boolean);
      if (!pres.length) return;
      var item = el("li");
      item.appendChild(el("strong", null, concept.title));
      item.appendChild(document.createTextNode(" requires "));
      pres.forEach(function (pre, index) {
        if (index) item.appendChild(document.createTextNode(index === pres.length - 1 ? " and " : ", "));
        var name = el("span", "rel-pre", pre.title);
        item.appendChild(name);
      });
      item.appendChild(document.createTextNode("."));
      var note = concept.status === "live" ? "Live" : "Coming soon";
      item.appendChild(el("span", "rel-status", note));
      list.appendChild(item);
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
    var filterMode = "all";
    var filterTrack = "";

    function siteTracks() {
      return (typeof BF_SITE !== "undefined" && BF_SITE && BF_SITE.tracks) || [];
    }

    function trackBySlug(slug) {
      if (!slug) return "";
      var tracks = siteTracks();
      for (var i = 0; i < tracks.length; i++) {
        if (tracks[i].slug === slug || tracks[i].name === slug) return tracks[i].name;
      }
      return "";
    }

    function slugFor(name) {
      var tracks = siteTracks();
      for (var i = 0; i < tracks.length; i++) {
        if (tracks[i].name === name) return tracks[i].slug;
      }
      return "";
    }

    function readFilterFromUrl() {
      var params = new URLSearchParams(window.location.search);
      var show = params.get("show");
      filterMode = show === "live" || show === "next" ? show : "all";
      filterTrack = trackBySlug(params.get("track") || "");
    }

    function writeFilterUrl() {
      var url = new URL(window.location.href);
      if (filterMode === "all") url.searchParams.delete("show");
      else url.searchParams.set("show", filterMode);
      if (!filterTrack) url.searchParams.delete("track");
      else url.searchParams.set("track", slugFor(filterTrack) || filterTrack);
      var next = url.pathname + url.search;
      if (next !== window.location.pathname + window.location.search) {
        window.history.replaceState(null, "", next);
      }
    }

    function syncFilterButtons() {
      var bar = root.querySelector("[data-map-filters]");
      if (!bar) return;
      bar.querySelectorAll("[data-show]").forEach(function (btn) {
        btn.setAttribute("aria-pressed", btn.getAttribute("data-show") === filterMode ? "true" : "false");
      });
      bar.querySelectorAll("[data-track-filter]").forEach(function (btn) {
        btn.setAttribute("aria-pressed", btn.getAttribute("data-track-filter") === filterTrack ? "true" : "false");
      });
    }

    function applyFilter(data) {
      board.classList.toggle("is-one-track", !!filterTrack);
      board.querySelectorAll("[data-node]").forEach(function (node) {
        var concept = byId(node.getAttribute("data-node"));
        if (!concept) return;
        var kind = classify(concept, data);
        var show = true;
        if (filterTrack && concept.track !== filterTrack) show = false;
        if (filterMode === "live" && concept.status !== "live") show = false;
        if (filterMode === "next" && kind !== "next") show = false;
        node.hidden = !show;
      });
      board.querySelectorAll(".cmap-col").forEach(function (col) {
        var track = col.getAttribute("data-track");
        var any = false;
        col.querySelectorAll("[data-node]").forEach(function (node) {
          if (!node.hidden) any = true;
        });
        col.hidden = (!!filterTrack && track !== filterTrack) || !any;
      });
      board.querySelectorAll("[data-group]").forEach(function (heading) {
        var any = false;
        var n = heading.nextElementSibling;
        while (n && !n.hasAttribute("data-group")) {
          if (n.hasAttribute("data-node") && !n.hidden) any = true;
          n = n.nextElementSibling;
        }
        heading.hidden = !!(heading.parentNode && heading.parentNode.hidden) || !any;
      });
      var empty = root.querySelector("[data-map-empty]");
      if (empty) empty.hidden = !!board.querySelector("[data-node]:not([hidden])");
      syncFilterButtons();
    }

    function buildFilters() {
      var bar = root.querySelector("[data-map-filters]");
      if (!bar) return;
      bar.replaceChildren();
      function add(label, attr, value) {
        var btn = el("button", "ghost tiny", label);
        btn.type = "button";
        btn.setAttribute(attr, value);
        btn.setAttribute("aria-pressed", "false");
        bar.appendChild(btn);
      }
      add("All", "data-show", "all");
      add("Live only", "data-show", "live");
      add("My next", "data-show", "next");
      trackNames().forEach(function (track) { add(track, "data-track-filter", track); });
      bar.addEventListener("click", function (event) {
        var target = event.target;
        if (target && target.nodeType !== 1) target = target.parentElement;
        var btn = target && target.closest ? target.closest("button") : null;
        if (!btn || !bar.contains(btn)) return;
        if (btn.hasAttribute("data-show")) filterMode = btn.getAttribute("data-show");
        else if (btn.hasAttribute("data-track-filter")) {
          var name = btn.getAttribute("data-track-filter");
          filterTrack = filterTrack === name ? "" : name;
        }
        writeFilterUrl();
        paint();
        schedule();
      });
    }

    function paint(prefix) {
      var data = readProgress();
      var tried = readTried();
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
        var text = "Visited " + opened + " of " + liveN + " · Tried " + triedCount(tried) + " of " + liveN + " · Next " + nextN + " · Locked " + lockedN;
        count.textContent = prefix ? prefix + " " + text : text;
      }
      if (reset) reset.disabled = !anyOpened(data) && !anyTried(tried);
      applyCurriculumState(board, data, tried);
      board.querySelectorAll("[data-track-progress]").forEach(function (node) {
        node.textContent = trackProgressText(node.getAttribute("data-track-progress"), data, tried);
      });
      applyFilter(data);
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
        if (node.hidden) return;
        var rect = node.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
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
      marker(defs, "arrow", "#d7b07a");
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
          var preTitle = byId(pid) ? byId(pid).title : pid;
          var halo = document.createElementNS(SVG_NS, "path");
          halo.setAttribute("class", "cedge-halo");
          halo.setAttribute("d", d);
          svg.appendChild(halo);
          var path = document.createElementNS(SVG_NS, "path");
          var classes = "cedge" + (lit ? " is-lit" : "");
          if (hot && (hot === pid || hot === concept.id)) classes += " is-hot";
          path.setAttribute("class", classes);
          path.setAttribute("data-a", pid);
          path.setAttribute("data-b", concept.id);
          path.setAttribute("d", d);
          path.setAttribute("marker-end", lit ? "url(#arrow-lit)" : "url(#arrow)");
          var tip = document.createElementNS(SVG_NS, "title");
          tip.textContent = concept.title + " requires " + preTitle;
          path.appendChild(tip);
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

    function describe(id) {
      var readout = root.querySelector("[data-edge-readout]");
      if (!readout) return;
      if (!id) {
        readout.textContent = "Lines run from a prerequisite to the concept that requires it.";
        return;
      }
      var concept = byId(id);
      if (!concept) return;
      var pres = (concept.prerequisites || []).map(byId).filter(Boolean);
      if (!pres.length) readout.textContent = concept.title + " has no prerequisites.";
      else {
        readout.textContent = concept.title + " requires " + pres.map(function (pre) { return pre.title; }).join(" and ") + ".";
      }
    }

    function highlight(id) {
      hot = id;
      describe(id);
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
        clearTried();
        paint("Progress reset.");
        schedule();
      });
    }

    window.addEventListener("storage", function (event) {
      if (event.key !== PROGRESS_KEY && event.key !== TRIED_KEY) return;
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

    readFilterFromUrl();
    buildFilters();
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

  var INTENTS = [
    { id: "cost", label: "Cut cost", prefer: ["tokens", "prompt-caching", "cost-forecasting"], track: "Foundations" },
    { id: "quality", label: "Improve answer quality", prefer: ["hallucination", "prompting", "evaluation-basics"], track: "Foundations" },
    { id: "docs", label: "Ground answers in my docs", prefer: ["rag", "citation-grounding", "chunking", "embeddings-retrieval"], track: "Retrieval & Grounding" },
    { id: "agent", label: "Build an agent", prefer: ["tool-calling", "agent-loop", "agent-evaluation"], track: "Agents" },
    { id: "ship", label: "Ship to production", prefer: ["production-evaluation", "observability", "fallbacks"], track: "Ship & Maintain" }
  ];

  function trackSlug(name) {
    var tracks = (typeof BF_SITE !== "undefined" && BF_SITE && BF_SITE.tracks) || [];
    for (var i = 0; i < tracks.length; i++) {
      if (tracks[i].name === name) return tracks[i].slug;
    }
    return "";
  }

  function routeIntent(intent) {
    var i;
    for (i = 0; i < intent.prefer.length; i++) {
      var concept = byId(intent.prefer[i]);
      if (concept && concept.status === "live") return { href: hrefOf(concept), label: concept.title };
    }
    var slug = trackSlug(intent.track);
    return { href: slug ? "/tracks/" + slug : "/map", label: intent.track };
  }

  function initIntent(root) {
    INTENTS.forEach(function (intent) {
      var link = root.querySelector('[data-intent="' + intent.id + '"]');
      if (!link) return;
      var dest = routeIntent(intent);
      link.href = dest.href;
      var slot = link.querySelector("[data-intent-dest]");
      if (slot) slot.textContent = dest.label;
    });
  }

  function initStart() {
    var concept = byId("tokens");
    if (!concept) return;
    var link = document.querySelector("[data-start-link]");
    var reason = document.querySelector("[data-start-reason]");
    if (link && concept.status === "live") link.href = hrefOf(concept);
    if (reason && concept.summary) reason.textContent = concept.summary;
  }

  function updateConcepts(entry) {
    return (entry.concepts || []).map(byId).filter(Boolean);
  }

  function renderUpdateList(list) {
    if (typeof BF_UPDATES === "undefined" || !BF_UPDATES || !BF_UPDATES.length) return;
    list.replaceChildren();
    BF_UPDATES.forEach(function (entry) {
      var item = el("li");
      var time = el("time", null, entry.date);
      time.setAttribute("datetime", entry.date);
      item.appendChild(time);
      var body = el("div");
      body.appendChild(el("strong", null, entry.title));
      body.appendChild(el("p", "fine", entry.line));
      var concepts = updateConcepts(entry);
      if (concepts.length) {
        var row = el("p", "fine update-concepts");
        concepts.forEach(function (concept, index) {
          if (index) row.appendChild(document.createTextNode(", "));
          if (concept.status === "live") {
            var link = el("a", null, concept.title);
            link.href = hrefOf(concept);
            row.appendChild(link);
          } else {
            row.appendChild(document.createTextNode(concept.title));
          }
        });
        body.appendChild(row);
      }
      item.appendChild(body);
      list.appendChild(item);
    });
  }

  function initUpdates(root) {
    var list = root.querySelector("[data-updates]");
    if (list) renderUpdateList(list);
  }

  function elevateFreshness() {
    var checked = document.querySelector("[data-last-checked]");
    if (checked) checked.classList.add("is-prominent");
    var changed = document.querySelector(".changed");
    var top = document.querySelector(".card-top");
    if (!changed || !top) return;
    top.insertAdjacentElement("afterend", changed);
    changed.classList.add("is-prominent");
  }

  function initTried() {
    var id = document.body.getAttribute("data-concept");
    if (!id) return;
    var concept = byId(id);
    if (!concept || concept.status !== "live") return;
    var apply = document.querySelector(".apply-card");
    if (!apply) return;
    var button = apply.querySelector("[data-mark-tried]");
    if (!button) {
      button = el("button", "ghost try-toggle");
      button.type = "button";
      button.setAttribute("data-mark-tried", "");
      apply.appendChild(button);
    }
    function paint() {
      var on = readTried()[id] === true;
      button.setAttribute("aria-pressed", on ? "true" : "false");
      button.textContent = on ? "Tried" : "Mark as tried";
    }
    button.addEventListener("click", function () {
      var data = readTried();
      data[id] = data[id] !== true;
      writeTried(data);
      paint();
    });
    window.addEventListener("storage", function (event) {
      if (event.key === TRIED_KEY) paint();
    });
    paint();
  }

  onReady(function () {
    markVisit();
    initCard();
    elevateFreshness();
    initTried();
    initStart();
    renderLiveCards(document);
    renderTrackBoard(document);
    document.querySelectorAll("[data-widget='updates']").forEach(initUpdates);
    document.querySelectorAll("[data-widget='intent']").forEach(initIntent);
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

