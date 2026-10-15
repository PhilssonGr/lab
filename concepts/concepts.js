/* Shared behavior for /concepts. No network calls. */
(function () {
  "use strict";

  var CAP = 100;
  var CHIP_LIMIT = 400;

  var CARDS = [
    {
      title: "Tokens",
      href: "/concepts/tokens",
      track: "Foundations",
      blurb: "A token is a piece of text the model reads or writes. Bills and limits count tokens.",
      keys: ["token", "tokens", "tokenizer", "tokenize", "tokenization", "billing", "bill", "cost", "price", "chunk", "chunks", "split", "character", "characters", "word", "words", "tiktoken", "bpe", "subword", "approximate", "budget", "spend", "piece"]
    },
    {
      title: "Context Window",
      href: "/concepts/context-window",
      track: "Foundations",
      blurb: "The fixed text one request can hold: instructions, history, documents, and the answer.",
      keys: ["context", "window", "windows", "limit", "limits", "history", "chat", "thread", "document", "documents", "overflow", "cut", "cuts", "truncated", "truncation", "forgotten", "forget", "older", "system", "memory"]
    },
    {
      title: "Prompting",
      href: "/concepts/prompting",
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

  onReady(function () {
    document.querySelectorAll("[data-tabs]").forEach(initTabs);
    document.querySelectorAll("[data-widget='tokens']").forEach(initTokens);
    document.querySelectorAll("[data-widget='context']").forEach(initContext);
    document.querySelectorAll("[data-widget='prompt']").forEach(initPrompt);
    var ask = document.querySelector("[data-widget='ask']");
    if (ask) initAsk(ask);
  });
})();
