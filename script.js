(function () {
  "use strict";

  var intro = document.getElementById("intro");
  var main = document.getElementById("main");
  var enterBtn = document.getElementById("enter-blackout");
  var lines = intro ? intro.querySelectorAll("[data-intro-line]") : [];
  var manifestoReveal = document.querySelector("[data-manifesto-reveal]");
  var newsCards = document.querySelectorAll("[data-news-card]");
  var xFeed = document.getElementById("x-feed");
  var twitterScriptAppended = false;
  var xWidgetsLoaded = false;

  var FIRST_DELAY_MS = 420;
  var LINE_GAP_MS = 400;
  var BUTTON_DELAY_MS = 520;
  var CHAR_MIN_MS = 36;
  var CHAR_JITTER_MS = 32;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function introCharDelay() {
    return CHAR_MIN_MS + Math.floor(Math.random() * CHAR_JITTER_MS);
  }

  function stopIntroTypingSfx() {
    var el = document.getElementById("intro-typing-sfx");
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  }

  function startIntroTypingSfx() {
    var el = document.getElementById("intro-typing-sfx");
    if (!el || !el.paused) return;
    el.volume = 0.42;
    var p = el.play();
    if (p && typeof p.then === "function") {
      p.catch(function () {});
    }
  }

  function showIntroSequence() {
    if (!lines.length) return;

    var reduced = prefersReducedMotion();

    if (reduced) {
      lines.forEach(function (line) {
        var text = line.getAttribute("data-text") || "";
        var typed = line.querySelector(".intro__typed");
        var caret = line.querySelector(".intro__caret");
        if (typed) typed.textContent = text;
        if (caret) caret.classList.add("intro__caret--off");
        line.classList.add("is-visible");
      });
      window.setTimeout(function () {
        if (enterBtn) enterBtn.hidden = false;
      }, 120);
      return;
    }

    function finishAndShowButton() {
      stopIntroTypingSfx();
      window.setTimeout(function () {
        if (enterBtn) enterBtn.hidden = false;
      }, BUTTON_DELAY_MS);
    }

    function typeLine(index) {
      if (index >= lines.length) {
        stopIntroTypingSfx();
        finishAndShowButton();
        return;
      }

      var line = lines[index];
      var text = line.getAttribute("data-text") || "";
      var typed = line.querySelector(".intro__typed");
      var caret = line.querySelector(".intro__caret");

      if (index > 0) {
        var prev = lines[index - 1];
        var prevCaret = prev.querySelector(".intro__caret");
        if (prevCaret) prevCaret.classList.add("intro__caret--off");
      }

      line.classList.add("is-visible");
      if (typed) typed.textContent = "";
      if (caret) caret.classList.remove("intro__caret--off");

      var i = 0;
      function tick() {
        if (!typed) return;
        if (i >= text.length) {
          stopIntroTypingSfx();
          window.setTimeout(function () {
            typeLine(index + 1);
          }, LINE_GAP_MS);
          return;
        }
        typed.textContent += text.charAt(i);
        i += 1;
        startIntroTypingSfx();
        window.setTimeout(tick, introCharDelay());
      }

      var startDelay = index === 0 ? FIRST_DELAY_MS : 0;
      window.setTimeout(tick, startDelay);
    }

    typeLine(0);
  }

  function leaveIntro() {
    if (!intro || !main) return;

    intro.classList.add("is-leaving");
    main.hidden = false;
    main.removeAttribute("aria-hidden");

    var onEnd = function () {
      intro.hidden = true;
      intro.setAttribute("aria-hidden", "true");
      intro.removeEventListener("transitionend", onEnd);
    };

    intro.addEventListener("transitionend", onEnd, { once: true });
    window.setTimeout(function () {
      if (intro && !intro.hidden) onEnd();
    }, 1000);

    window.requestAnimationFrame(function () {
      main.classList.add("is-visible");
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
    });
  }

  function ensureTwitterWidgets(callback) {
    if (window.twttr && window.twttr.widgets) {
      if (typeof window.twttr.ready === "function") {
        window.twttr.ready(callback);
      } else {
        callback();
      }
      return;
    }
    if (twitterScriptAppended) {
      var tries = 0;
      var poll = window.setInterval(function () {
        tries++;
        if (window.twttr && window.twttr.widgets) {
          window.clearInterval(poll);
          if (typeof window.twttr.ready === "function") {
            window.twttr.ready(callback);
          } else {
            callback();
          }
        } else if (tries > 100) {
          window.clearInterval(poll);
        }
      }, 50);
      return;
    }
    twitterScriptAppended = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://platform.twitter.com/widgets.js";
    s.charset = "utf-8";
    s.onload = function () {
      if (typeof window.twttr.ready === "function") {
        window.twttr.ready(callback);
      } else {
        callback();
      }
    };
    document.body.appendChild(s);
  }

  function loadTwitterEmbedsOnce() {
    if (!xFeed || xWidgetsLoaded) return;
    if (!xFeed.querySelector(".twitter-tweet")) return;
    ensureTwitterWidgets(function () {
      if (window.twttr && window.twttr.widgets && typeof window.twttr.widgets.load === "function") {
        window.twttr.widgets.load(xFeed);
        xWidgetsLoaded = true;
      }
    });
  }

  function initNewsTabs() {
    var tabGrid = document.getElementById("tab-grid");
    var tabX = document.getElementById("tab-x");
    var panelGrid = document.getElementById("panel-grid");
    var panelX = document.getElementById("panel-x");
    if (!tabGrid || !tabX || !panelGrid || !panelX) return;

    function select(which) {
      var isGrid = which === "grid";
      panelGrid.hidden = !isGrid;
      panelX.hidden = isGrid;
      tabGrid.setAttribute("aria-selected", isGrid ? "true" : "false");
      tabX.setAttribute("aria-selected", isGrid ? "false" : "true");
      tabGrid.tabIndex = isGrid ? 0 : -1;
      tabX.tabIndex = isGrid ? -1 : 0;
      if (!isGrid) {
        loadTwitterEmbedsOnce();
      }
    }

    tabGrid.addEventListener("click", function () {
      select("grid");
    });
    tabX.addEventListener("click", function () {
      select("x");
    });
  }

  function observeReveal(el) {
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-in-view");
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
    );

    io.observe(el);
  }

  function setCardExpanded(card, open) {
    var panel = card.querySelector(".card__expand");
    var next = open !== undefined ? open : !card.classList.contains("is-expanded");

    card.classList.toggle("is-expanded", next);
    card.setAttribute("aria-expanded", next ? "true" : "false");
    if (panel) {
      panel.setAttribute("aria-hidden", next ? "false" : "true");
    }
  }

  function setCardBg(element, imageUrl) {
    if (!element) return;
    var resolved = String(imageUrl).trim();
    try {
      if (!/^https?:\/\//i.test(resolved)) {
        resolved = new URL(resolved, document.baseURI).href;
      }
    } catch (e) {
      return;
    }
    element.style.backgroundImage =
      "linear-gradient(rgba(10,10,10,0.68), rgba(10,10,10,0.78)), url(" +
      JSON.stringify(resolved) +
      ")";
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
    element.style.backgroundRepeat = "no-repeat";
  }

  function initNewsCardBackgrounds() {
    var pairs = [
      [".card-spain .card__bg", "assets/spain.jpg"],
      [".card-france .card__bg", "assets/france.jpg"],
      [".card-brazil .card__bg", "assets/brazil.jpg"],
      [".card-chile .card__bg", "assets/chile.jpg"]
    ];
    pairs.forEach(function (row) {
      var el = document.querySelector(row[0]);
      if (el) {
        setCardBg(el, row[1]);
      }
    });
  }

  function initMintCopyButtons() {
    function fallbackCopy(text, onDone) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch (e) {}
      document.body.removeChild(ta);
      if (onDone) onDone();
    }

    var setups = [
      {
        btn: document.getElementById("hero-copy-mint"),
        full: document.getElementById("hero-mint-full"),
        feedback: document.getElementById("hero-copy-feedback")
      }
    ];

    setups.forEach(function (pair) {
      if (!pair.btn || !pair.full || !pair.feedback) return;

      var copyTimer = null;

      function copyAddress() {
        var text = pair.full.textContent.trim();
        var done = function () {
          pair.feedback.textContent = "Copied";
          if (copyTimer) window.clearTimeout(copyTimer);
          copyTimer = window.setTimeout(function () {
            pair.feedback.textContent = "";
          }, 2200);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () {
            fallbackCopy(text, done);
          });
        } else {
          fallbackCopy(text, done);
        }
      }

      pair.btn.addEventListener("click", copyAddress);
    });
  }

  function initNewsCards() {
    newsCards.forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (e.target.closest("[data-news-link]")) return;
        setCardExpanded(card);
      });

      var link = card.querySelector("[data-news-link]");
      if (link) {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          setCardExpanded(card);
        });
      }

      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setCardExpanded(card);
        }
      });
    });
  }

  function initBgMusic() {
    var audio = document.getElementById("bg-music");
    var btn = document.getElementById("sound-toggle");
    if (!audio || !btn) return;

    var label = btn.querySelector(".sound-toggle__text");
    var vol = 0.36;
    var playlist = ["assets/bg-music.mp3", "assets/bg-music-2.mp3"];
    var trackIndex = 0;
    var userMuted = false;
    var advancing = false;
    var enterSfxTimer = null;

    function setPlaying(playing) {
      btn.setAttribute("aria-pressed", playing ? "true" : "false");
      btn.setAttribute("aria-label", playing ? "Pause background music" : "Play background music");
      btn.classList.toggle("sound-toggle--on", playing);
      if (label) {
        label.textContent = playing ? "On" : "Off";
      }
    }

    function playCurrent() {
      audio.volume = vol;
      var p = audio.play();
      if (p && typeof p.then === "function") {
        p.catch(function () {
          advancing = false;
          setPlaying(false);
        });
      }
    }

    btn.addEventListener("click", function () {
      if (audio.paused) {
        userMuted = false;
        playCurrent();
      } else {
        userMuted = true;
        audio.pause();
      }
    });

    audio.addEventListener("pause", function () {
      if (advancing) return;
      if (audio.ended) return;
      setPlaying(false);
    });

    audio.addEventListener("playing", function () {
      advancing = false;
      setPlaying(true);
    });

    audio.addEventListener("ended", function () {
      if (userMuted) return;
      advancing = true;
      trackIndex = (trackIndex + 1) % playlist.length;
      audio.src = playlist[trackIndex];
      audio.load();
      playCurrent();
    });

    audio.addEventListener("error", function () {
      btn.disabled = true;
      btn.classList.remove("sound-toggle--on");
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-label", "Background music unavailable");
      btn.title = "Add assets/bg-music.mp3 and assets/bg-music-2.mp3";
      if (label) {
        label.textContent = "—";
      }
    });

    if (enterBtn) {
      enterBtn.addEventListener("click", function () {
        stopIntroTypingSfx();

        var enterSfx = document.getElementById("intro-enter-sfx");
        if (enterSfx) {
          if (enterSfxTimer) {
            window.clearTimeout(enterSfxTimer);
            enterSfxTimer = null;
          }
          enterSfx.pause();
          enterSfx.currentTime = 0;
          enterSfx.volume = 0.55;
          var ep = enterSfx.play();
          if (ep && typeof ep.then === "function") {
            ep.catch(function () {});
          }
          enterSfxTimer = window.setTimeout(function () {
            enterSfx.pause();
            enterSfx.currentTime = 0;
            enterSfxTimer = null;
          }, 1000);
        }

        leaveIntro();
        userMuted = false;
        playCurrent();
      });
    }
  }

  showIntroSequence();
  observeReveal(manifestoReveal);
  initNewsTabs();
  initNewsCardBackgrounds();
  initNewsCards();
  initMintCopyButtons();
  initBgMusic();
})();
