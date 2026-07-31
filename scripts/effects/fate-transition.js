(function () {
  "use strict";

  function createFateTransitionController(options) {
    var runtime = options.runtime;
    var timeline = runtime.createTimerGroup();
    var soundtrack = null;
    var inProgress = false;

    function getForcedOutcome() {
      var params = new URLSearchParams(window.location.search);
      var fate = (params.get("fate") || "").toLowerCase();
      if (fate === "hit" || fate === "success") return true;
      if (fate === "miss" || fate === "fail") return false;
      if (params.get("surprise") === "1") return true;
      if (params.get("surprise") === "0") return false;
      return null;
    }

    function shouldShowSecretSurprise(result) {
      var forcedOutcome = getForcedOutcome();
      return forcedOutcome === null ? Boolean(result.secretSurprise) : forcedOutcome;
    }

    function getAudio() {
      if (!soundtrack) {
        soundtrack = new Audio(options.audioSource);
        soundtrack.preload = "auto";
        soundtrack.volume = 0.72;
      }
      return soundtrack;
    }

    function warm() {
      runtime.hydrateDeferredImages(document.getElementById("fateTransition"));
      var audio = getAudio();
      if (audio.readyState === 0) audio.load();
    }

    function playAudio() {
      var audio = getAudio();
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.72;
      var playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function () {
          document.body.dataset.fateAudio = "blocked";
        });
      }
    }

    function stopAudio() {
      if (!soundtrack) return;
      soundtrack.pause();
      soundtrack.currentTime = 0;
    }

    function reset() {
      timeline.clear();
      stopAudio();
      inProgress = false;
      document.body.classList.remove("is-fate-transition-open");
      var transition = document.getElementById("fateTransition");
      if (!transition) return;
      transition.classList.remove("is-active", "is-rolling", "is-revealed", "is-hit", "is-miss");
      transition.setAttribute("aria-hidden", "true");
      var outcome = document.getElementById("fateOutcome");
      if (outcome) outcome.textContent = "";
    }

    function finish(result) {
      var transition = document.getElementById("fateTransition");
      options.renderResult(result);
      document.body.classList.remove("is-fate-transition-open");
      if (transition) {
        transition.classList.remove("is-active");
        transition.setAttribute("aria-hidden", "true");
      }
      timeline.schedule(function () {
        if (transition) transition.classList.remove("is-rolling", "is-revealed", "is-hit", "is-miss");
        inProgress = false;
        stopAudio();
      }, 380);
    }

    function start(result) {
      if (!result || inProgress) return;
      var transition = document.getElementById("fateTransition");
      var outcome = document.getElementById("fateOutcome");
      if (!transition || !outcome) {
        options.renderResult(result);
        return;
      }

      timeline.clear();
      warm();
      if (result.secretSurprise) options.warmSurpriseImages();
      inProgress = true;
      document.body.classList.add("is-fate-transition-open");
      transition.classList.remove("is-rolling", "is-revealed", "is-hit", "is-miss");
      transition.setAttribute("aria-hidden", "false");
      outcome.textContent = "";
      void transition.offsetWidth;
      transition.classList.add("is-active", "is-rolling");

      var reducedMotion = options.prefersReducedMotion();
      if (!reducedMotion) playAudio();

      var revealDelay = reducedMotion ? 280 : 4250;
      var finishDelay = reducedMotion ? 980 : (result.secretSurprise ? 5450 : 6500);

      timeline.schedule(function () {
        transition.classList.add("is-revealed");
        if (result.secretSurprise) {
          transition.classList.add("is-hit");
          outcome.textContent = "它们来了！";
        } else {
          transition.classList.add("is-miss");
          outcome.textContent = "啊哦~大佐喇叭逃跑了🐱";
        }
      }, revealDelay);

      timeline.schedule(function () {
        finish(result);
      }, finishDelay);
    }

    return Object.freeze({
      getForcedOutcome: getForcedOutcome,
      shouldShowSecretSurprise: shouldShowSecretSurprise,
      warm: warm,
      reset: reset,
      start: start
    });
  }

  window.CATBTI_EFFECTS = window.CATBTI_EFFECTS || {};
  window.CATBTI_EFFECTS.createFateTransitionController = createFateTransitionController;
}());
