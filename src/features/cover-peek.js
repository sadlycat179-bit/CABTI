(function () {
  "use strict";

  window.CATBTI_FEATURES = window.CATBTI_FEATURES || {};

  window.CATBTI_FEATURES.createCoverPeekController = function (options) {
    var loadImageElement = options.runtime.loadImageElement;
    var prefersReducedMotion = options.prefersReducedMotion;
    var resizeFrame = null;
    var showTimer = null;
    var hideTimer = null;
    var activeCat = null;
    var lastCat = null;
    var angles = [-165, -150, -135, -120, -105, -90, -75, -60, -45, -30, -15];
    var states = {
      dazuo: { angle: null, lastAngle: null, firstAngle: -90, contactX: 0.485, widthRatio: 0.219, coverInsetRatio: 0.56 },
      laba: { angle: null, lastAngle: null, firstAngle: -15, contactX: 0.496, widthRatio: 0.231, coverInsetRatio: 0.57 }
    };

    function randomDelay(minimum, maximum) {
      return minimum + Math.round(Math.random() * (maximum - minimum));
    }

    function getPeek(catKey) {
      return document.querySelector('[data-peek-cat="' + catKey + '"]');
    }

    function angleDistance(first, second) {
      var difference = Math.abs(first - second) % 360;
      return Math.min(difference, 360 - difference);
    }

    function chooseAngle(catKey) {
      var state = states[catKey];
      if (state.firstAngle !== null) {
        var firstAngle = state.firstAngle;
        state.firstAngle = null;
        return firstAngle;
      }
      var candidates = angles.filter(function (angle) {
        return state.lastAngle === null || angleDistance(angle, state.lastAngle) >= 42;
      });
      if (!candidates.length) candidates = angles.slice();
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    function clampSize(value, minimum, maximum) {
      return Math.max(minimum, Math.min(maximum, value));
    }

    function getWidth(catKey, frameSize) {
      var state = states[catKey];
      var minimum = catKey === "laba" ? 72 : 68;
      var maximum = catKey === "laba" ? 112 : 106;
      return clampSize(frameSize * state.widthRatio, minimum, maximum);
    }

    function layout(catKey) {
      var peek = getPeek(catKey);
      var state = states[catKey];
      var visual = document.querySelector(".hero-visual");
      var frame = document.querySelector(".hero-cover-frame");
      var image = peek && peek.querySelector("img");
      if (!peek || !visual || !frame || !image || !image.naturalWidth || state.angle === null) return false;

      var visualRect = visual.getBoundingClientRect();
      var frameRect = frame.getBoundingClientRect();
      var centerX = frameRect.left + frameRect.width / 2 - visualRect.left;
      var centerY = frameRect.top + frameRect.height / 2 - visualRect.top;
      var frameSize = frame.offsetWidth;
      var radius = frameSize * 0.496;
      var radians = state.angle * Math.PI / 180;
      var radialX = Math.cos(radians);
      var radialY = Math.sin(radians);
      var width = getWidth(catKey, frameSize);
      var height = width * image.naturalHeight / image.naturalWidth;
      var anchorX = centerX + radialX * radius;
      var anchorY = centerY + radialY * radius;
      var coverInset = height * state.coverInsetRatio;
      var visibleAnchorX = anchorX - radialX * coverInset;
      var visibleAnchorY = anchorY - radialY * coverInset;
      var travel = Math.min(height * 0.72, window.innerWidth <= 640 ? 54 : 76);

      peek.style.left = (visibleAnchorX - width * state.contactX) + "px";
      peek.style.top = (visibleAnchorY - height) + "px";
      peek.style.width = width + "px";
      peek.style.height = height + "px";
      peek.style.setProperty("--peek-contact-x", (state.contactX * 100) + "%");
      peek.style.setProperty("--peek-rotation", (state.angle + 90) + "deg");
      peek.style.setProperty("--peek-in-x", (-radialX * travel) + "px");
      peek.style.setProperty("--peek-in-y", (-radialY * travel) + "px");
      peek.dataset.angle = String(state.angle);
      peek.dataset.coverInset = coverInset.toFixed(2);
      return true;
    }

    function chooseNextCat() {
      if (!lastCat) return "dazuo";
      return lastCat === "dazuo" ? "laba" : "dazuo";
    }

    function schedule(delay) {
      window.clearTimeout(showTimer);
      if (document.body.dataset.view !== "home" || prefersReducedMotion()) return;
      showTimer = window.setTimeout(function () {
        show(chooseNextCat());
      }, delay);
    }

    function show(catKey) {
      var peek = getPeek(catKey);
      var state = states[catKey];
      if (!peek || activeCat || document.body.dataset.view !== "home" || prefersReducedMotion()) return;
      if (document.hidden) {
        schedule(600);
        return;
      }

      var image = peek.querySelector("img");
      if (image && image.dataset.src) {
        loadImageElement(image, image.dataset.src, {
          priority: "high",
          sizes: "(max-width: 640px) 112px, 148px"
        }).then(function () {
          if (!activeCat && document.body.dataset.view === "home") show(catKey);
        });
        return;
      }

      state.angle = chooseAngle(catKey);
      if (!layout(catKey)) {
        schedule(300);
        return;
      }
      activeCat = catKey;
      lastCat = catKey;
      peek.classList.remove("is-hiding", "is-visible");
      peek.setAttribute("aria-hidden", "false");
      peek.tabIndex = 0;
      void peek.offsetWidth;
      peek.classList.add("is-visible");
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(function () {
        hide(catKey, false);
      }, randomDelay(5200, 7200));
    }

    function hide(catKey, wasTapped) {
      var peek = getPeek(catKey);
      var state = states[catKey];
      if (!peek || !peek.classList.contains("is-visible")) return;
      window.clearTimeout(hideTimer);
      peek.classList.remove("is-visible");
      peek.classList.add("is-hiding");
      peek.setAttribute("aria-hidden", "true");
      peek.tabIndex = -1;
      state.lastAngle = state.angle;
      hideTimer = window.setTimeout(function () {
        peek.classList.remove("is-hiding");
        state.angle = null;
        activeCat = null;
        schedule(wasTapped ? randomDelay(700, 1200) : randomDelay(1500, 2600));
      }, 190);
    }

    function suspend() {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      Object.keys(states).forEach(function (catKey) {
        var state = states[catKey];
        var peek = getPeek(catKey);
        state.angle = null;
        if (!peek) return;
        peek.classList.remove("is-visible", "is-hiding");
        peek.setAttribute("aria-hidden", "true");
        peek.tabIndex = -1;
      });
      activeCat = null;
    }

    function resume(delay) {
      if (!activeCat) schedule(delay);
    }

    function pointerIsOutsideCover(event) {
      var frame = document.querySelector(".hero-cover-frame");
      if (!frame) return false;
      var frameRect = frame.getBoundingClientRect();
      var centerX = frameRect.left + frameRect.width / 2;
      var centerY = frameRect.top + frameRect.height / 2;
      return Math.hypot(event.clientX - centerX, event.clientY - centerY) >= frame.offsetWidth * 0.496 - 1;
    }

    function init() {
      var desktopHover = window.matchMedia("(hover: hover) and (pointer: fine)");
      document.querySelectorAll("[data-peek-cat]").forEach(function (peek) {
        var catKey = peek.dataset.peekCat;
        var hideOnDesktopHover = function (event) {
          if (event.pointerType !== "mouse" || !desktopHover.matches || !peek.classList.contains("is-visible")) return;
          if (pointerIsOutsideCover(event)) hide(catKey, true);
        };
        peek.addEventListener("pointerenter", hideOnDesktopHover);
        peek.addEventListener("pointermove", hideOnDesktopHover);
        peek.addEventListener("click", function (event) {
          if (!peek.classList.contains("is-visible")) return;
          event.preventDefault();
          hide(catKey, true);
        });
        peek.querySelector("img").addEventListener("load", function () {
          if (states[catKey].angle !== null) layout(catKey);
        });
      });
      window.addEventListener("resize", function () {
        window.cancelAnimationFrame(resizeFrame);
        resizeFrame = window.requestAnimationFrame(function () {
          if (activeCat) layout(activeCat);
        });
      });
      if ("ResizeObserver" in window) {
        new ResizeObserver(function () {
          if (activeCat) layout(activeCat);
        }).observe(document.querySelector(".hero-cover-frame"));
      }
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) suspend();
        else if (document.body.dataset.view === "home") resume(500);
      });
      resume(700);
    }

    return {
      init: init,
      resume: resume,
      suspend: suspend
    };
  };
}());
