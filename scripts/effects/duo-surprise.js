(function () {
  "use strict";

  function createDuoSurpriseController(options) {
    var animationTimer = null;
    var hintTimer = null;
    var interactionTimer = null;
    var settleTimer = null;
    var currentAudio = null;
    var audioCache = {};

    function updateCaption(surprise, text) {
      var caption = surprise && surprise.querySelector("#surpriseCaption");
      var copy = caption && caption.querySelector(".surprise-caption-copy");
      if (copy) copy.textContent = text;
      else if (caption) caption.textContent = text;
    }

    function resetClasses(surprise) {
      if (!surprise) return;
      surprise.classList.remove("is-active", "is-ready", "is-cats-settled", "is-dazuo-push", "is-laba-push", "is-dazuo-speak", "is-laba-speak", "is-ending");
      surprise.dataset.dazuoClicked = "";
      surprise.dataset.labaClicked = "";
      updateCaption(surprise, "礼盒里好像有猫在讲话……");
      var endButton = surprise.querySelector("#surpriseEndButton");
      if (endButton) endButton.classList.remove("is-pressing");
    }

    function stopCurrentAudio() {
      if (!currentAudio) return;
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    function clearTimers() {
      window.clearTimeout(animationTimer);
      window.clearTimeout(hintTimer);
      window.clearTimeout(interactionTimer);
      window.clearTimeout(settleTimer);
    }

    function resetForResult(surprise, portrait) {
      clearTimers();
      stopCurrentAudio();
      if (portrait) portrait.classList.remove("is-secret-surprise", "is-playing-surprise", "is-surprise-complete");
      document.body.classList.remove("is-secret-surprise-open");
      resetClasses(surprise);
      if (surprise) {
        surprise.classList.remove("is-active", "is-ready");
        surprise.setAttribute("aria-hidden", "true");
      }
    }

    function complete(surprise, portrait) {
      clearTimers();
      stopCurrentAudio();
      portrait.classList.remove("is-playing-surprise");
      portrait.classList.add("is-surprise-complete");
      document.body.classList.remove("is-secret-surprise-open");
      resetClasses(surprise);
      surprise.setAttribute("aria-hidden", "true");
    }

    function start(surprise, portrait) {
      if (!surprise || !portrait || portrait.classList.contains("is-playing-surprise")) return;
      clearTimers();
      portrait.classList.remove("is-surprise-complete");
      portrait.classList.add("is-playing-surprise");
      document.body.classList.add("is-secret-surprise-open");
      resetClasses(surprise);
      void surprise.offsetWidth;
      surprise.classList.add("is-active");
      surprise.setAttribute("aria-hidden", "false");
      updateCaption(surprise, "礼盒里好像有猫在讲话……");
      options.playOpeningSound();
      options.playCatMeowAudio();
      settleTimer = window.setTimeout(function () {
        surprise.classList.add("is-cats-settled");
      }, 2250);
    }

    function getAudioSource(catKey) {
      return catKey === "dazuo" ? options.dazuoAudioSource : options.labaAudioSource;
    }

    function warmCatAudio(catKey) {
      var source = getAudioSource(catKey);
      if (!audioCache[catKey]) {
        audioCache[catKey] = new Audio(source);
        audioCache[catKey].preload = "auto";
      }
      if (audioCache[catKey].readyState === 0) audioCache[catKey].load();
    }

    function playCatAudio(catKey) {
      stopCurrentAudio();
      warmCatAudio(catKey);
      currentAudio = audioCache[catKey];
      currentAudio.currentTime = 0;
      currentAudio.volume = catKey === "dazuo" ? 0.72 : 0.68;
      document.body.dataset.surpriseCatAudio = catKey + "-starting";
      return currentAudio.play().then(function () {
        document.body.dataset.surpriseCatAudio = catKey + "-playing";
        return true;
      }).catch(function () {
        document.body.dataset.surpriseCatAudio = catKey + "-blocked";
        return false;
      });
    }

    function prepare(surprise, portrait) {
      if (!surprise || !portrait) return;
      if (surprise.parentElement !== document.body) document.body.appendChild(surprise);
      options.warmImages();
      portrait.classList.add("is-secret-surprise");
      document.body.classList.add("is-secret-surprise-open");
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        complete(surprise, portrait);
        return;
      }

      surprise.setAttribute("aria-hidden", "false");
      resetClasses(surprise);
      ["dazuo", "laba"].forEach(warmCatAudio);
      void surprise.offsetWidth;
      surprise.classList.add("is-ready");
      options.playGiftHintSound();
      hintTimer = window.setTimeout(function () {
        if (surprise.classList.contains("is-ready")) options.playGiftHintSound();
      }, 1650);
    }

    function interact(surprise, catKey) {
      if (!surprise || !surprise.classList.contains("is-active")) return;
      window.clearTimeout(interactionTimer);
      surprise.classList.remove("is-dazuo-push", "is-laba-push", "is-dazuo-speak", "is-laba-speak");
      void surprise.offsetWidth;
      if (catKey === "dazuo") {
        surprise.dataset.dazuoClicked = "1";
        surprise.classList.add("is-dazuo-push", "is-dazuo-speak");
        updateCaption(surprise, "大佐：偶是一枚风度翩翩的绅士吖");
      } else {
        surprise.dataset.labaClicked = "1";
        surprise.classList.add("is-laba-push", "is-laba-speak");
        updateCaption(surprise, "喇叭：橘猫体型优势，启动。");
      }
      playCatAudio(catKey);
      interactionTimer = window.setTimeout(function () {
        surprise.classList.remove("is-dazuo-push", "is-laba-push");
      }, 560);
    }

    function end(surprise, portrait) {
      var endButton = surprise && surprise.querySelector("#surpriseEndButton");
      if (endButton) endButton.classList.add("is-pressing");
      options.playButtonClickSound();
      window.clearTimeout(animationTimer);
      animationTimer = window.setTimeout(function () {
        if (surprise) surprise.classList.add("is-ending");
      }, 90);
      animationTimer = window.setTimeout(function () {
        if (endButton) endButton.classList.remove("is-pressing");
        complete(surprise, portrait);
      }, 360);
    }

    function bind(surprise, getPortrait) {
      surprise.addEventListener("click", function (event) {
        var portrait = getPortrait();
        if (event.target.closest(".gift-box")) {
          start(surprise, portrait);
          return;
        }
        var catButton = event.target.closest("[data-duel-cat]");
        if (catButton) {
          interact(surprise, catButton.dataset.duelCat);
          return;
        }
        if (event.target.closest("#surpriseEndButton")) end(surprise, portrait);
      });
      surprise.addEventListener("pointerdown", function (event) {
        var catButton = event.target.closest("[data-duel-cat]");
        if (catButton) warmCatAudio(catButton.dataset.duelCat);
      }, { passive: true });
      surprise.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (event.target.closest(".gift-box")) {
          event.preventDefault();
          start(surprise, getPortrait());
          return;
        }
        var catButton = event.target.closest("[data-duel-cat]");
        if (catButton) {
          event.preventDefault();
          interact(surprise, catButton.dataset.duelCat);
          return;
        }
        if (event.target.closest("#surpriseEndButton")) {
          event.preventDefault();
          end(surprise, getPortrait());
        }
      });
    }

    return Object.freeze({
      resetForResult: resetForResult,
      prepare: prepare,
      bind: bind
    });
  }

  window.CATBTI_EFFECTS = window.CATBTI_EFFECTS || {};
  window.CATBTI_EFFECTS.createDuoSurpriseController = createDuoSurpriseController;
}());
