(function () {
  "use strict";

  var intro = document.getElementById("intro");
  var main = document.getElementById("main");
  var enterBtn = document.getElementById("enter-blackout");
  var lines = intro ? intro.querySelectorAll("[data-intro-line]") : [];
  var manifestoReveal = document.querySelector("[data-manifesto-reveal]");
  var newsCards = document.querySelectorAll("[data-news-card]");

  var LINE_DELAY_MS = 1400;
  var FIRST_DELAY_MS = 400;
  var BUTTON_DELAY_MS = 600;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function showIntroSequence() {
    if (!lines.length) return;

    var reduced = prefersReducedMotion();
    var step = reduced ? 0 : LINE_DELAY_MS;

    lines.forEach(function (line, i) {
      var delay = reduced ? 0 : FIRST_DELAY_MS + i * step;
      window.setTimeout(function () {
        line.classList.add("is-visible");
      }, delay);
    });

    var afterLines = reduced
      ? 0
      : FIRST_DELAY_MS + lines.length * step + BUTTON_DELAY_MS;

    window.setTimeout(function () {
      if (enterBtn) {
        enterBtn.hidden = false;
      }
    }, afterLines);
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

  if (enterBtn) {
    enterBtn.addEventListener("click", leaveIntro);
  }

  showIntroSequence();
  observeReveal(manifestoReveal);
  initNewsCardBackgrounds();
  initNewsCards();
  initMintCopyButtons();
})();
