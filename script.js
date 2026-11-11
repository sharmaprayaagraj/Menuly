/* ============================================================
   Menuly — script.js
   - Light / dark theme with saved preference
   - Scroll reveals, reading progress, mobile nav
   - Pointer effects that only run while the cursor is present
   All motion is transform/opacity based and respects
   prefers-reduced-motion.
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var root = document.documentElement;

  /* ---------- 1. Theme ---------- */
  var themeToggle = document.getElementById("themeToggle");
  var themeColor = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme, save) {
    root.dataset.theme = theme;
    var dark = theme === "dark";

    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", dark ? "true" : "false");
      themeToggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    }
    if (themeColor) {
      themeColor.setAttribute("content", dark ? "#0b0907" : "#fff8ec");
    }
    if (save) {
      try { localStorage.setItem("menuly-theme", theme); } catch (e) { /* private mode */ }
    }
  }

  // The head script already picked saved-or-system; mirror it into the button.
  applyTheme(root.dataset.theme === "dark" ? "dark" : "light", false);

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = root.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next, true);
    });
  }

  /* ---------- 2. Scroll reveal ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

  // stagger siblings so groups cascade instead of popping in together
  var groups = new Map();
  revealEls.forEach(function (el) {
    var parent = el.parentElement;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);
  });
  groups.forEach(function (els) {
    els.forEach(function (el, i) {
      if (!el.style.getPropertyValue("--delay")) {
        el.style.setProperty("--delay", Math.min(i, 5) * 80 + "ms");
      }
    });
  });

  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- 3. Steps connector ---------- */
  var steps = document.querySelector(".steps");
  if (steps && "IntersectionObserver" in window) {
    var stepsObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            steps.classList.add("is-visible");
            stepsObserver.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );
    stepsObserver.observe(steps);
  } else if (steps) {
    steps.classList.add("is-visible");
  }

  /* ---------- 4. Header state + reading progress ---------- */
  var header = document.getElementById("siteHeader");
  var progressBar = document.getElementById("progressBar");
  var scrollQueued = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle("is-stuck", y > 24);

    if (progressBar) {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(1, y / max) : 0;
      progressBar.style.transform = "scaleX(" + pct + ")";
    }
    scrollQueued = false;
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!scrollQueued) {
        scrollQueued = true;
        window.requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  onScroll();

  /* ---------- 5. Mobile nav ---------- */
  var navToggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Open menu");
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.focus();
      }
    });
  }

  /* ---------- 6. Hero spotlight + parallax (runs only while hovering) ---------- */
  var hero = document.querySelector(".hero");
  var spotlight = document.getElementById("spotlight");
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  var heroRect = null;
  var spotX = 0, spotY = 0, targetX = 0, targetY = 0;
  var spotRaf = null;
  var hoverRaf = null;
  var lastNX = 0, lastNY = 0;

  function animateSpot() {
    spotX += (targetX - spotX) * 0.14;
    spotY += (targetY - spotY) * 0.14;
    spotlight.style.transform = "translate3d(" + spotX + "px," + spotY + "px,0) translate(-50%,-50%)";

    var settled = Math.abs(targetX - spotX) < 0.5 && Math.abs(targetY - spotY) < 0.5;
    spotRaf = settled ? null : window.requestAnimationFrame(animateSpot);
  }

  if (!reduceMotion && finePointer && hero && spotlight) {
    hero.addEventListener("pointerenter", function () {
      heroRect = hero.getBoundingClientRect();
      hero.classList.add("has-pointer");
    });

    hero.addEventListener("pointerleave", function () {
      hero.classList.remove("has-pointer");
      if (spotRaf) window.cancelAnimationFrame(spotRaf);
      spotRaf = null;
      if (hoverRaf) window.cancelAnimationFrame(hoverRaf);
      hoverRaf = null;
      parallaxEls.forEach(function (el) { el.style.transform = ""; });
    });

    hero.addEventListener("pointermove", function (e) {
      if (!heroRect) heroRect = hero.getBoundingClientRect();
      targetX = e.clientX - heroRect.left;
      targetY = e.clientY - heroRect.top;

      if (spotRaf === null) spotRaf = window.requestAnimationFrame(animateSpot);

      if (hoverRaf === null) {
        var nx = (e.clientX / window.innerWidth - 0.5) * 2;
        var ny = (e.clientY / window.innerHeight - 0.5) * 2;
        hoverRaf = window.requestAnimationFrame(function () {
          if (Math.abs(nx - lastNX) > 0.002 || Math.abs(ny - lastNY) > 0.002) {
            parallaxEls.forEach(function (el) {
              var depth = parseFloat(el.getAttribute("data-parallax")) || 0;
              el.style.transform = "translate3d(" + nx * depth * 180 + "px," + ny * depth * 180 + "px,0)";
            });
            lastNX = nx;
            lastNY = ny;
          }
          hoverRaf = null;
        });
      }
    });
  }

  /* ---------- 7. Phone tilt ---------- */
  var phone = document.getElementById("phoneTilt");
  if (phone && !reduceMotion && finePointer) {
    var heroVisual = phone.parentElement;
    var phoneRaf = null;

    heroVisual.addEventListener("pointermove", function (e) {
      if (phoneRaf !== null) return;
      var rect = heroVisual.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;
      phoneRaf = window.requestAnimationFrame(function () {
        phone.style.transform =
          "perspective(1100px) rotateY(" + px * 12 + "deg) rotateX(" + -py * 10 + "deg) rotateZ(-2deg)";
        phoneRaf = null;
      });
    });

    heroVisual.addEventListener("pointerleave", function () {
      phone.style.transform = "";
    });
  }

  /* ---------- 8. Browser-frame tilt ---------- */
  if (!reduceMotion && finePointer) {
    Array.prototype.slice.call(document.querySelectorAll("[data-tilt]")).forEach(function (item) {
      var frame = item.querySelector(".browser");
      if (!frame) return;
      var tiltRaf = null;

      item.addEventListener("pointermove", function (e) {
        if (tiltRaf !== null) return;
        var rect = item.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        tiltRaf = window.requestAnimationFrame(function () {
          frame.style.transform =
            "perspective(1000px) rotateY(" + px * 6 + "deg) rotateX(" + -py * 6 + "deg) translateY(-6px)";
          tiltRaf = null;
        });
      });

      item.addEventListener("pointerleave", function () {
        frame.style.transform = "";
      });
    });
  }

  /* ---------- 9. Card glow follows the cursor ---------- */
  if (!reduceMotion && finePointer) {
    Array.prototype.slice.call(document.querySelectorAll(".problem-card")).forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", e.clientX - rect.left + "px");
        card.style.setProperty("--my", e.clientY - rect.top + "px");
      });
    });
  }

  /* ---------- 10. Magnetic buttons ---------- */
  if (!reduceMotion && finePointer) {
    Array.prototype.slice.call(document.querySelectorAll(".btn-magnetic")).forEach(function (btn) {
      btn.addEventListener("pointermove", function (e) {
        var rect = btn.getBoundingClientRect();
        var x = (e.clientX - rect.left - rect.width / 2) / rect.width;
        var y = (e.clientY - rect.top - rect.height / 2) / rect.height;
        btn.style.transform = "translate3d(" + x * 7 + "px," + (y * 7 - 3) + "px,0)";
      });

      btn.addEventListener("pointerleave", function () {
        btn.style.transform = "";
      });
    });
  }
})();
