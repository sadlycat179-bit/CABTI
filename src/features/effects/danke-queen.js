(function () {
  "use strict";

  function createDankeQueenController(options) {
    var closeTimer = null;
    var entryTimer = null;
    var interactionTimer = null;
    var particleTimer = null;
    var currentAudio = null;

    function clearTimers() {
      window.clearTimeout(closeTimer);
      window.clearTimeout(entryTimer);
      window.clearTimeout(interactionTimer);
      window.clearTimeout(particleTimer);
    }

    function stopAudio() {
      if (!currentAudio) return;
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    function close(pop) {
      if (pop) pop.classList.remove("is-queen-speaking", "is-queen-entering", "is-queen-interacting", "is-queen-bursting");
      document.body.classList.remove("is-danke-queen-open");
    }

    function reset() {
      var pop = document.getElementById("dankeQueenPop");
      clearTimers();
      close(pop);
      stopAudio();
    }

    function configureTrigger(cat) {
      var trigger = document.getElementById("resultTitle");
      if (!trigger) return;
      var enabled = cat && cat.type === "KISS";
      trigger.classList.toggle("is-danke-trigger", enabled);
      trigger.classList.remove("is-trigger-pressing");
      if (enabled) {
        trigger.setAttribute("role", "button");
        trigger.tabIndex = 0;
        trigger.setAttribute("aria-label", "点击亲亲触发蛋壳彩蛋");
      } else {
        trigger.removeAttribute("role");
        trigger.removeAttribute("tabindex");
        trigger.removeAttribute("aria-label");
      }
    }

    function trigger() {
      var pop = document.getElementById("dankeQueenPop");
      if (!pop) return;
      options.warmImages();
      clearTimers();
      pop.classList.remove("is-queen-speaking", "is-queen-entering", "is-queen-interacting", "is-queen-bursting");
      void pop.offsetWidth;
      pop.classList.add("is-queen-speaking", "is-queen-entering", "is-queen-bursting");
      document.body.classList.add("is-danke-queen-open");
      options.playEntrySound();
      entryTimer = window.setTimeout(function () {
        pop.classList.remove("is-queen-entering");
      }, 2300);
      particleTimer = window.setTimeout(function () {
        pop.classList.remove("is-queen-bursting");
      }, 900);
      closeTimer = window.setTimeout(function () {
        close(pop);
      }, 5000);
    }

    function playInteractionAudio() {
      stopAudio();
      currentAudio = new Audio(options.interactionAudioSource);
      currentAudio.volume = 0.78;
      document.body.dataset.dankeQueenAudio = "starting";
      return currentAudio.play().then(function () {
        document.body.dataset.dankeQueenAudio = "playing";
      }).catch(function () {
        document.body.dataset.dankeQueenAudio = "blocked";
      });
    }

    function interact(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      var pop = document.getElementById("dankeQueenPop");
      if (!pop || !pop.classList.contains("is-queen-speaking")) return;
      window.clearTimeout(interactionTimer);
      window.clearTimeout(particleTimer);
      pop.classList.remove("is-queen-interacting", "is-queen-bursting");
      void pop.offsetWidth;
      pop.classList.add("is-queen-interacting", "is-queen-bursting");
      playInteractionAudio();
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(function () {
        close(pop);
      }, 4200);
      particleTimer = window.setTimeout(function () {
        pop.classList.remove("is-queen-bursting");
      }, 900);
      interactionTimer = window.setTimeout(function () {
        pop.classList.remove("is-queen-interacting");
      }, 920);
    }

    function pressTrigger(triggerElement) {
      if (!triggerElement || !triggerElement.classList.contains("is-danke-trigger")) return;
      triggerElement.classList.add("is-trigger-pressing");
      window.setTimeout(function () {
        triggerElement.classList.remove("is-trigger-pressing");
      }, 170);
      trigger();
    }

    return Object.freeze({
      reset: reset,
      configureTrigger: configureTrigger,
      pressTrigger: pressTrigger,
      interact: interact
    });
  }

  window.CATBTI_EFFECTS = window.CATBTI_EFFECTS || {};
  window.CATBTI_EFFECTS.createDankeQueenController = createDankeQueenController;
}());
