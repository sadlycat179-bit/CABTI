(function () {
  "use strict";

  var manifest = window.CATBTI_IMAGE_MANIFEST || {};
  var queuedImages = new WeakMap();
  var queue = [];
  var activeLoads = 0;
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var constrainedConnection = Boolean(
    connection &&
    (connection.saveData || connection.effectiveType === "slow-2g" || connection.effectiveType === "2g")
  );
  var maxConcurrentLoads = constrainedConnection ? 1 : 2;
  var priorityRank = { high: 0, normal: 1, idle: 2 };
  var queueOrder = 0;

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

  function normalizeSource(source) {
    if (!source || /^(?:data:|blob:|https?:|\/\/)/i.test(source)) return source || "";
    return source.split("?")[0].split("#")[0].replace(/^\.\//, "");
  }

  function getImageAsset(source) {
    var entry = manifest[normalizeSource(source)];
    if (!entry) {
      return { original: source, src: source, srcset: "", width: 0, height: 0 };
    }
    return {
      original: source,
      src: entry.src,
      srcset: entry.srcset || "",
      width: entry.width || 0,
      height: entry.height || 0
    };
  }

  function decodeImage(image) {
    if (!image) return Promise.resolve(false);
    if (typeof image.decode === "function") {
      return image.decode().then(function () { return true; }).catch(function () {
        return image.complete && image.naturalWidth > 0;
      });
    }
    if (image.complete) return Promise.resolve(image.naturalWidth > 0);
    return new Promise(function (resolve) {
      image.addEventListener("load", function () { resolve(true); }, { once: true });
      image.addEventListener("error", function () { resolve(false); }, { once: true });
    });
  }

  function assignImageSource(image, source, sizes) {
    var asset = getImageAsset(source);
    if (asset.srcset) {
      image.srcset = asset.srcset;
      image.sizes = sizes || image.dataset.sizes || "100vw";
    }
    if (asset.width && !image.hasAttribute("width")) image.width = asset.width;
    if (asset.height && !image.hasAttribute("height")) image.height = asset.height;
    image.src = asset.src;
    return asset;
  }

  function pumpQueue() {
    while (activeLoads < maxConcurrentLoads && queue.length) {
      queue.sort(function (left, right) {
        return priorityRank[left.priority] - priorityRank[right.priority] || left.order - right.order;
      });
      var job = queue.shift();
      activeLoads += 1;
      Promise.resolve()
        .then(job.run)
        .then(job.resolve, job.resolve)
        .finally(function () {
          activeLoads -= 1;
          pumpQueue();
        });
    }
  }

  function enqueue(run, priority) {
    return new Promise(function (resolve) {
      queue.push({
        run: run,
        resolve: resolve,
        priority: priorityRank[priority] === undefined ? "normal" : priority,
        order: queueOrder++
      });
      pumpQueue();
    });
  }

  function loadImageElement(image, source, options) {
    if (!image || !source) return Promise.resolve(false);
    var existing = queuedImages.get(image);
    if (existing) return existing;
    var settings = typeof options === "string" ? { priority: options } : (options || {});
    var promise = enqueue(function () {
      image.dataset.imageLoadState = "loading";
      assignImageSource(image, source, settings.sizes);
      image.removeAttribute("data-src");
      return decodeImage(image).then(function (loaded) {
        image.dataset.imageLoadState = loaded ? "ready" : "error";
        return loaded;
      });
    }, settings.priority || "normal");
    queuedImages.set(image, promise);
    return promise;
  }

  function setDeferredImageSource(image, options) {
    if (!image || !image.dataset || !image.dataset.src) return false;
    loadImageElement(image, image.dataset.src, options);
    return true;
  }

  function hydrateDeferredImages(root, limit, options) {
    if (!root) return Promise.resolve([]);
    var settings = options;
    var maximum = limit;
    if (typeof limit === "object" || typeof limit === "string") {
      settings = limit;
      maximum = undefined;
    }
    var images = Array.from(root.querySelectorAll("img[data-src]")).slice(0, maximum || undefined);
    return Promise.all(images.map(function (image) {
      return loadImageElement(image, image.dataset.src, settings);
    }));
  }

  function runWhenIdle(callback, timeout) {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(callback, { timeout: timeout || 1200 });
      return;
    }
    window.setTimeout(callback, Math.min(timeout || 360, 700));
  }

  function preloadImage(source, options) {
    if (!source) return Promise.resolve(false);
    var settings = typeof options === "string" ? { priority: options } : (options || {});
    var image = new Image();
    image.decoding = "async";
    return loadImageElement(image, source, settings);
  }

  window.CATBTI_RUNTIME = Object.freeze({
    createTimerGroup: createTimerGroup,
    getImageAsset: getImageAsset,
    assignImageSource: assignImageSource,
    loadImageElement: loadImageElement,
    decodeImage: decodeImage,
    setDeferredImageSource: setDeferredImageSource,
    hydrateDeferredImages: hydrateDeferredImages,
    runWhenIdle: runWhenIdle,
    preloadImage: preloadImage
  });
}());
