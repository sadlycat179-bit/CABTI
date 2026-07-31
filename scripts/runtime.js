(function () {
  "use strict";

  function createTimerGroup() {
    var timers = [];

    return {
      schedule: function (callback, delay) {
        var timer = window.setTimeout(function () {
          timers = timers.filter(function (candidate) { return candidate !== timer; });
          callback();
        }, delay);
        timers.push(timer);
        return timer;
      },
      clear: function () {
        timers.forEach(window.clearTimeout);
        timers = [];
      }
    };
  }

  function setDeferredImageSource(image) {
    if (!image || !image.dataset || !image.dataset.src || image.src) return false;
    image.src = image.dataset.src;
    image.removeAttribute("data-src");
    return true;
  }

  function hydrateDeferredImages(root, limit) {
    if (!root) return;
    Array.from(root.querySelectorAll("img[data-src]"))
      .slice(0, limit || undefined)
      .forEach(setDeferredImageSource);
  }

  function runWhenIdle(callback, timeout) {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(callback, { timeout: timeout || 1200 });
      return;
    }
    window.setTimeout(callback, Math.min(timeout || 360, 700));
  }

  function preloadImage(source) {
    if (!source) return;
    var image = new Image();
    image.decoding = "async";
    image.src = source;
  }

  window.CATBTI_RUNTIME = Object.freeze({
    createTimerGroup: createTimerGroup,
    setDeferredImageSource: setDeferredImageSource,
    hydrateDeferredImages: hydrateDeferredImages,
    runWhenIdle: runWhenIdle,
    preloadImage: preloadImage
  });
}());
