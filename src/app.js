(function () {
  "use strict";

  var config = window.CATBTI_CONFIG;
  var runtime = window.CATBTI_RUNTIME;
  var setDeferredImageSource = runtime.setDeferredImageSource;
  var hydrateDeferredImages = runtime.hydrateDeferredImages;
  var runWhenIdle = runtime.runWhenIdle;
  var preloadImage = runtime.preloadImage;
  var getImageAsset = runtime.getImageAsset;
  var loadImageElement = runtime.loadImageElement;
  var views = Array.from(document.querySelectorAll(".view"));
  var audioContext = null;
  var surpriseDelayTimer = null;
  var duoSurpriseController = null;
  var receiptTimer = null;
  var currentPhotoIndex = 0;
  var currentPhotoCount = 0;
  var resultPhotoImages = [];
  var currentResultCat = null;
  var galleryReturnView = null;
  var galleryImageObserver = null;
  var catIntroTimer = null;
  var dialogEffectTimer = null;
  var dankeQueenController = null;
  var fateTransitionController = null;
  var coverPeekController = null;
  var quizController = null;
  var receiptPrintDuration = 2800;

  function getByPath(object, path) {
    return path.split(".").reduce(function (value, key) { return value && value[key]; }, object);
  }

  function fillConfiguredContent() {
    document.querySelectorAll("[data-content]").forEach(function (node) {
      node.textContent = getByPath(config, node.dataset.content) || "";
    });
    document.title = config.site.name + " · " + config.site.eyebrow;
    document.querySelector('meta[name="description"]').content = config.site.intro;
  }

  function showView(name) {
    views.forEach(function (view) {
      view.classList.toggle("is-active", view.id === name + "View");
    });
    document.body.dataset.view = name;
    if (name === "home") coverPeekController.resume(650);
    else coverPeekController.suspend();
    if (name === "gallery") {
      hydrateDeferredImages(document.querySelector(".student-guide"), 1, { priority: "normal" });
      primeGalleryImages(window.innerWidth <= 640 ? 2 : 3);
    }
    window.scrollTo(0, 0);
    document.getElementById("app").focus({ preventScroll: true });
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function getCatImages(cat) {
    if (cat.imagePending) return [];
    return cat.images && cat.images.length ? cat.images : (cat.image ? [cat.image] : []);
  }

  function responsiveImageAttributes(source, sizes, deferred, priority) {
    if (deferred) {
      return 'data-src="' + source + '" data-sizes="' + sizes + '" loading="lazy"';
    }
    var asset = getImageAsset(source);
    var attributes = 'src="' + asset.src + '"';
    if (asset.srcset) attributes += ' srcset="' + asset.srcset + '" sizes="' + sizes + '"';
    if (asset.width) attributes += ' width="' + asset.width + '"';
    if (asset.height) attributes += ' height="' + asset.height + '"';
    if (priority) attributes += ' fetchpriority="' + priority + '"';
    return attributes;
  }

  function preloadResultPhoto(index, priority) {
    if (!resultPhotoImages.length) return Promise.resolve(false);
    var normalizedIndex = (index + resultPhotoImages.length) % resultPhotoImages.length;
    var image = document.querySelector('#resultPhotoTrack img[data-photo-index="' + normalizedIndex + '"]');
    if (!image) return Promise.resolve(false);
    if (!image.dataset.src) return runtime.decodeImage(image);
    return loadImageElement(image, image.dataset.src, {
      priority: priority || "normal",
      sizes: "(max-width: 900px) 88vw, 600px"
    });
  }

  function preloadNearbyResultPhotos(index) {
    if (!resultPhotoImages.length) return;
    preloadResultPhoto(index, "high").then(function () {
      runWhenIdle(function () {
        preloadResultPhoto(index + 1, "idle");
      }, 720);
    });
  }

  function initGalleryLazyImages() {
    var images = Array.from(document.querySelectorAll("#catGrid img[data-src]"));
    if (!images.length) return;
    if (!("IntersectionObserver" in window)) {
      hydrateDeferredImages(document.getElementById("catGrid"));
      return;
    }
    if (!galleryImageObserver) {
      galleryImageObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          setDeferredImageSource(entry.target, { priority: "normal" });
          galleryImageObserver.unobserve(entry.target);
        });
      }, { rootMargin: "120px 0px" });
    }
    images.forEach(function (image) { galleryImageObserver.observe(image); });
  }

  function primeGalleryImages(count) {
    hydrateDeferredImages(document.getElementById("catGrid"), count || 3, { priority: "idle" });
    initGalleryLazyImages();
  }

  function warmDazuoSurpriseImages(stage) {
    var surprise = document.getElementById("dazuoSurprise");
    if (!surprise) return Promise.resolve([]);
    if (stage === "gift") {
      return hydrateDeferredImages(surprise.querySelector(".gift-box"), 1, { priority: "high" });
    }
    if (stage === "cats") {
      return hydrateDeferredImages(surprise.querySelector(".cat-duel-stage"), undefined, { priority: "high" });
    }
    return hydrateDeferredImages(surprise, undefined, { priority: "normal" });
  }

  function warmDankeQueenImages(priority) {
    return hydrateDeferredImages(
      document.getElementById("dankeQueenPop"),
      undefined,
      { priority: priority || "normal" }
    );
  }

  function updatePhotoPagination(index) {
    currentPhotoIndex = Math.max(0, Math.min(index, currentPhotoCount - 1));
    document.querySelectorAll("#photoPagination button").forEach(function (button, buttonIndex) {
      var active = buttonIndex === currentPhotoIndex;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "true" : "false");
    });
  }

  function showPhoto(index, behavior) {
    var track = document.getElementById("resultPhotoTrack");
    if (!currentPhotoCount || !track.clientWidth) return;
    var nextIndex = (index + currentPhotoCount) % currentPhotoCount;
    preloadNearbyResultPhotos(nextIndex);
    track.scrollTo({ left: track.clientWidth * nextIndex, behavior: behavior || "smooth" });
    updatePhotoPagination(nextIndex);
  }

  function renderPhotoCarousel(cat) {
    var images = getCatImages(cat);
    var track = document.getElementById("resultPhotoTrack");
    var pagination = document.getElementById("photoPagination");
    var portrait = document.querySelector(".result-portrait-wrap");
    resultPhotoImages = images.slice();
    currentPhotoCount = images.length;
    currentPhotoIndex = 0;
    track.innerHTML = images.length ? images.map(function (image, index) {
      return '<img ' + responsiveImageAttributes(image, "(max-width: 900px) 88vw, 600px", true) + ' data-photo-index="' + index + '" alt="' + cat.name + '的照片 ' + (index + 1) + '" decoding="async" style="object-fit:contain">';
    }).join("") : '<div class="photo-placeholder" role="img" aria-label="' + cat.name + '的照片待补充"><span>ฅ</span><strong>' + cat.name + '</strong><small>照片待补充</small></div>';
    pagination.innerHTML = images.map(function (_, index) {
      return '<button type="button" data-photo-index="' + index + '" aria-label="查看第 ' + (index + 1) + ' 张照片" aria-current="' + (index === 0) + '"></button>';
    }).join("");
    portrait.classList.toggle("has-single-photo", images.length <= 1);
    portrait.classList.toggle("has-multiple-photos", images.length > 1);
    portrait.classList.toggle("has-pending-photo", images.length === 0);
    track.scrollLeft = 0;
    updatePhotoPagination(0);
    if (images.length) preloadNearbyResultPhotos(0);
  }

  function completeReceiptPrint(scene, resultView) {
    scene.classList.add("is-printed");
    resultView.classList.add("is-receipt-ready");
    playCatIntroEffect(document.querySelector(".result-photo-stage"), currentResultCat, "result");
  }

  function completeCatIntroEffect(host) {
    if (!host) return;
    host.classList.remove("is-cat-intro-pending", "is-cat-intro-active");
    host.classList.add("is-cat-intro-complete");
  }

  function prepareCatIntroEffect(host, cat) {
    if (!host) return;
    host.classList.remove("is-cat-intro-pending", "is-cat-intro-active", "is-cat-intro-complete");
    if (cat && cat.introEffect === "big-face") {
      host.classList.add("is-cat-intro-pending");
      var effectImage = host.querySelector(".cat-intro-effect img");
      if (effectImage) effectImage.src = "assets/images/surprises/zuoxiajiao-surprise-cutout.png";
    } else {
      host.classList.add("is-cat-intro-complete");
    }
  }

  function playCatIntroEffect(host, cat, context) {
    if (!host || !cat || cat.introEffect !== "big-face") return;
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.clearTimeout(context === "dialog" ? dialogEffectTimer : catIntroTimer);
    if (reducedMotion) {
      completeCatIntroEffect(host);
      return;
    }
    host.classList.remove("is-cat-intro-complete");
    host.classList.add("is-cat-intro-pending");
    void host.offsetWidth;
    host.classList.add("is-cat-intro-active");
    var finish = function () { completeCatIntroEffect(host); };
    if (context === "dialog") dialogEffectTimer = window.setTimeout(finish, 2700);
    else catIntroTimer = window.setTimeout(finish, 2700);
  }

  function startReceiptPrint() {
    var scene = document.getElementById("receiptScene");
    var resultView = document.getElementById("resultView");

    window.clearTimeout(receiptTimer);
    scene.classList.remove("is-printing", "is-printed");
    resultView.classList.remove("is-receipt-ready");
    window.requestAnimationFrame(function () {
      completeReceiptPrint(scene, resultView);
    });
  }

  function splitStoryText(text) {
    var paragraphs = [];
    String(text || "").split(/\n\s*\n/).forEach(function (section) {
      var fragments = section.match(/[^。！？!?；;]+[。！？!?；;]+|[^。！？!?；;]+$/g) || [];
      var current = "";
      var fragmentCount = 0;

      fragments.forEach(function (fragment) {
        var next = fragment.trim();
        if (!next) return;
        if (current && (current.length + next.length > 96 || fragmentCount >= 3)) {
          paragraphs.push(current);
          current = "";
          fragmentCount = 0;
        }
        current += next;
        fragmentCount += 1;
      });
      if (current) paragraphs.push(current);
    });
    return paragraphs.length ? paragraphs : [String(text || "")];
  }

  function renderPersonality(cat) {
    var container = document.getElementById("resultPersonality");
    container.replaceChildren();
    splitStoryText(cat.personality).forEach(function (text) {
      var paragraph = document.createElement("p");
      paragraph.textContent = text;
      container.appendChild(paragraph);
    });
  }

  function getStoryBlocks(cat) {
    var sourceBlocks = cat.storyBlocks || [{ text: cat.biography }];
    return sourceBlocks.reduce(function (blocks, block) {
      if (block.image) {
        blocks.push(block);
        return blocks;
      }
      splitStoryText(block.text).forEach(function (paragraph) {
        blocks.push({ text: paragraph });
      });
      return blocks;
    }, []);
  }

  function renderStory(cat) {
    var container = document.getElementById("resultBiography");
    var blocks = getStoryBlocks(cat);
    container.replaceChildren();
    blocks.forEach(function (block) {
      if (block.image) {
        var image = document.createElement("img");
        var storyAsset = getImageAsset(block.image);
        image.src = storyAsset.src;
        if (storyAsset.srcset) {
          image.srcset = storyAsset.srcset;
          image.sizes = "(max-width: 760px) 92vw, 620px";
        }
        image.loading = "lazy";
        image.decoding = "async";
        image.alt = cat.name + "的猫咪小传配图";
        image.width = storyAsset.width || block.width;
        image.height = storyAsset.height || block.height;
        container.appendChild(image);
        return;
      }
      var paragraph = document.createElement("p");
      paragraph.textContent = block.text;
      container.appendChild(paragraph);
    });
  }

  function renderResult(result) {
    var cat = result.cat || result;
    var resultType = document.getElementById("resultType");
    var surprise = document.getElementById("dazuoSurprise");
    var portrait = document.querySelector(".result-portrait-wrap");
    var showSecretSurprise = fateTransitionController.shouldShowSecretSurprise(result);

    currentResultCat = cat;
    window.clearTimeout(catIntroTimer);
    resultType.textContent = cat.type;
    resultType.dataset.length = cat.type.length;
    document.getElementById("resultTitle").textContent = cat.title;
    dankeQueenController.configureTrigger(cat);
    document.getElementById("resultBarcodeCode").textContent = "CATBTI · " + cat.type;
    renderPhotoCarousel(cat);
    prepareCatIntroEffect(document.querySelector(".result-photo-stage"), cat);
    document.getElementById("resultStamp").textContent = cat.type;
    document.getElementById("resultCatName").textContent = cat.name;
    renderPersonality(cat);
    renderStory(cat);
    document.getElementById("resultQuote").textContent = cat.quote;
    dankeQueenController.reset();
    window.clearTimeout(surpriseDelayTimer);
    duoSurpriseController.resetForResult(surprise, portrait);
    showView("result");
    startReceiptPrint();
    if (cat.type === "KISS") {
      window.setTimeout(function () { warmDankeQueenImages("idle"); }, 1400);
    }
    if (showSecretSurprise) {
      runWhenIdle(function () { warmDazuoSurpriseImages("gift"); }, 360);
      surpriseDelayTimer = window.setTimeout(function () {
        duoSurpriseController.prepare(surprise, portrait);
      }, 720);
    }
  }

  function playTone(startTime, frequency, duration, type, gainLevel) {
    var oscillator = audioContext.createOscillator();
    var gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.16, startTime + duration);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  function playSoftBoom(startTime) {
    var bufferSize = audioContext.sampleRate * 0.34;
    var buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    var data = buffer.getChannelData(0);
    for (var index = 0; index < bufferSize; index += 1) {
      var fade = 1 - index / bufferSize;
      data[index] = (Math.random() * 2 - 1) * fade * fade * 0.32;
    }
    var source = audioContext.createBufferSource();
    var filter = audioContext.createBiquadFilter();
    var gain = audioContext.createGain();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(520, startTime);
    filter.frequency.exponentialRampToValueAtTime(180, startTime + 0.34);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.34);
    source.connect(filter).connect(gain).connect(audioContext.destination);
    source.start(startTime);

    var thump = audioContext.createOscillator();
    var thumpGain = audioContext.createGain();
    thump.type = "sine";
    thump.frequency.setValueAtTime(118, startTime);
    thump.frequency.exponentialRampToValueAtTime(52, startTime + 0.24);
    thumpGain.gain.setValueAtTime(0.0001, startTime);
    thumpGain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.018);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);
    thump.connect(thumpGain).connect(audioContext.destination);
    thump.start(startTime);
    thump.stop(startTime + 0.3);
  }

  function playGiftRattle(startTime) {
    [0, 0.09, 0.18, 0.28, 0.39].forEach(function (offset, index) {
      var bufferSize = Math.round(audioContext.sampleRate * 0.055);
      var buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      var data = buffer.getChannelData(0);
      for (var sample = 0; sample < bufferSize; sample += 1) {
        var fade = 1 - sample / bufferSize;
        data[sample] = (Math.random() * 2 - 1) * fade * 0.22;
      }
      var source = audioContext.createBufferSource();
      var filter = audioContext.createBiquadFilter();
      var gain = audioContext.createGain();
      var hitTime = startTime + offset;
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(720 + index * 85, hitTime);
      filter.Q.setValueAtTime(1.4, hitTime);
      gain.gain.setValueAtTime(0.0001, hitTime);
      gain.gain.exponentialRampToValueAtTime(0.045, hitTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, hitTime + 0.055);
      source.connect(filter).connect(gain).connect(audioContext.destination);
      source.start(hitTime);
    });
  }

  function playMeow(startTime, basePitch, duration) {
    var voice = audioContext.createOscillator();
    var warmth = audioContext.createOscillator();
    var filter = audioContext.createBiquadFilter();
    var gain = audioContext.createGain();
    voice.type = "triangle";
    warmth.type = "sine";
    voice.frequency.setValueAtTime(basePitch, startTime);
    voice.frequency.exponentialRampToValueAtTime(basePitch * 1.55, startTime + duration * 0.35);
    voice.frequency.exponentialRampToValueAtTime(basePitch * 0.82, startTime + duration);
    warmth.frequency.setValueAtTime(basePitch * 0.5, startTime);
    warmth.frequency.exponentialRampToValueAtTime(basePitch * 0.41, startTime + duration);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(940, startTime);
    filter.frequency.exponentialRampToValueAtTime(690, startTime + duration);
    filter.Q.setValueAtTime(2.3, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.072, startTime + 0.035);
    gain.gain.setValueAtTime(0.06, startTime + duration * 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    voice.connect(filter);
    warmth.connect(filter);
    filter.connect(gain).connect(audioContext.destination);
    voice.start(startTime);
    warmth.start(startTime);
    voice.stop(startTime + duration + 0.02);
    warmth.stop(startTime + duration + 0.02);
  }

  function playDazuoSound() {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      document.body.dataset.dazuoAudio = "unsupported";
      return Promise.resolve(false);
    }
    audioContext = audioContext || new AudioContext();
    var resume = audioContext.state === "suspended" ? audioContext.resume() : Promise.resolve();
    return resume.then(function () {
      if (audioContext.state !== "running") {
        document.body.dataset.dazuoAudio = "blocked";
        return false;
      }
      document.body.dataset.dazuoAudio = "playing";
      var now = audioContext.currentTime + 0.04;
      playGiftRattle(now);
      playMeow(now + 0.04, 410, 0.3);
      playMeow(now + 0.36, 485, 0.28);
      playMeow(now + 0.66, 440, 0.34);
      playSoftBoom(now + 0.92);
      playTone(now + 1.04, 1046.5, 0.2, "sine", 0.105);
      playTone(now + 1.16, 1568, 0.22, "triangle", 0.085);
      playTone(now + 1.3, 2093, 0.24, "sine", 0.065);
      return true;
    }).catch(function () {
      document.body.dataset.dazuoAudio = "blocked";
      return false;
    });
  }

  function playCatMeowAudio() {
    var meow = new Audio("assets/audio/interactions/dazuo-interact.mp3");
    meow.volume = 0.62;
    document.body.dataset.catMeowAudio = "starting";
    return meow.play().then(function () {
      document.body.dataset.catMeowAudio = "playing";
      return true;
    }).catch(function () {
      document.body.dataset.catMeowAudio = "blocked";
      return false;
    });
  }

  function playGiftHintSound() {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    playCatMeowAudio();
    if (!AudioContext) return Promise.resolve(false);
    audioContext = audioContext || new AudioContext();
    var resume = audioContext.state === "suspended" ? audioContext.resume() : Promise.resolve();
    return resume.then(function () {
      if (audioContext.state !== "running") return false;
      var now = audioContext.currentTime + 0.04;
      playGiftRattle(now);
      playMeow(now + 0.34, 455, 0.28);
      document.body.dataset.dazuoAudio = "hint-playing";
      return true;
    }).catch(function () {
      document.body.dataset.dazuoAudio = "blocked";
      return false;
    });
  }

  function playButtonClickSound() {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return Promise.resolve(false);
    audioContext = audioContext || new AudioContext();
    var resume = audioContext.state === "suspended" ? audioContext.resume() : Promise.resolve();
    return resume.then(function () {
      if (audioContext.state !== "running") return false;
      var now = audioContext.currentTime + 0.02;
      playTone(now, 220, 0.06, "triangle", 0.045);
      playTone(now + 0.045, 132, 0.08, "sine", 0.035);
      return true;
    }).catch(function () { return false; });
  }

  function playMeowNow(basePitch, duration) {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioContext = audioContext || new AudioContext();
    var resume = audioContext.state === "suspended" ? audioContext.resume() : Promise.resolve();
    resume.then(function () {
      if (audioContext.state !== "running") return;
      playMeow(audioContext.currentTime + 0.03, basePitch, duration);
    }).catch(function () {});
  }

  function renderGallery() {
    var groups = [
      { key: "east", title: "东区", note: "东区出没的校园咪", types: ["LOVE-U", "KISS", "GLOW", "IDEA", "RUNNER"] },
      { key: "west", title: "西区", note: "西区出没的校园咪", types: ["HIHI"] },
      { key: "north", title: "北区", note: "北区出没的校园咪", types: ["SALT", "CHIL", "DEVIL", "XXXL", "SONG", "DRINK", "LAMP"] },
      { key: "ranger", title: "游侠", note: "喜欢在校园里到处巡游", types: ["EATER", "BOSS", "IDOL"] }
    ];

    function renderCatCard(cat) {
      var index = config.cats.indexOf(cat);
      var image = getCatImages(cat)[0];
      var imageMarkup = image
        ? '<img ' + responsiveImageAttributes(image, "(max-width: 640px) 42vw, 260px", true) + ' alt="' + cat.name + '" decoding="async" style="object-fit:contain">'
        : '<span class="card-photo-placeholder"><i>ฅ</i><b>照片待补充</b></span>';
      return '<button class="cat-card" type="button" data-cat-index="' + index + '" aria-label="查看' + cat.name + '的资料">' +
        '<span class="card-image">' + imageMarkup + '<i>' + cat.type + "</i></span>" +
        '<span class="card-copy"><small>' + cat.title + "</small><strong>" + cat.name + '<span class="card-arrow" aria-hidden="true">↗</span></strong></span>' +
        "</button>";
    }

    document.getElementById("catGrid").innerHTML = groups.map(function (group) {
      var cats = group.types.map(function (type) {
        return config.cats.find(function (cat) { return cat.type === type; });
      }).filter(Boolean);
      return '<section class="cat-region cat-region-' + group.key + '" aria-labelledby="region-' + group.key + '">' +
        '<div class="region-heading"><span class="region-marker" aria-hidden="true"></span><div><h3 id="region-' + group.key + '">' + group.title + '</h3><p>' + group.note + '</p></div><strong>' + cats.length + ' 只</strong></div>' +
        '<div class="cat-grid">' + cats.map(renderCatCard).join("") + '</div></section>';
    }).join("");
    initGalleryLazyImages();
  }

  function updateDialogPhotoPagination(host, index) {
    var track = host && host.querySelector(".dialog-photo-track");
    var slides = track ? track.querySelectorAll(".dialog-cover") : [];
    if (!slides.length) return;
    var currentIndex = Math.max(0, Math.min(index, slides.length - 1));
    host.querySelectorAll("[data-dialog-photo-index]").forEach(function (button, buttonIndex) {
      var active = buttonIndex === currentIndex;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "true" : "false");
    });
    host.dataset.photoIndex = currentIndex;
  }

  function showDialogPhoto(host, index, behavior) {
    var track = host && host.querySelector(".dialog-photo-track");
    var slides = track ? track.querySelectorAll(".dialog-cover") : [];
    if (!track || !slides.length || !track.clientWidth) return;
    var nextIndex = (index + slides.length) % slides.length;
    var nextImage = slides[nextIndex];
    if (nextImage && nextImage.dataset.src) {
      loadImageElement(nextImage, nextImage.dataset.src, {
        priority: "high",
        sizes: "(max-width: 720px) 92vw, 620px"
      });
    }
    track.scrollTo({ left: track.clientWidth * nextIndex, behavior: behavior || "smooth" });
    updateDialogPhotoPagination(host, nextIndex);
    runWhenIdle(function () {
      var followingImage = slides[(nextIndex + 1) % slides.length];
      if (followingImage && followingImage.dataset.src) {
        loadImageElement(followingImage, followingImage.dataset.src, {
          priority: "idle",
          sizes: "(max-width: 720px) 92vw, 620px"
        });
      }
    }, 780);
  }

  function openCatDialog(index) {
    var cat = config.cats[index];
    var images = getCatImages(cat);
    var imageMarkup = images.length
      ? '<div class="dialog-photo-carousel' + (images.length > 1 ? ' has-multiple-photos' : '') + '">' +
          '<div class="dialog-photo-track">' + images.map(function (image, imageIndex) {
            var imageAttributes = responsiveImageAttributes(image, "(max-width: 720px) 92vw, 620px", imageIndex !== 0, imageIndex === 0 ? "high" : "");
            return '<img class="dialog-cover" ' + imageAttributes + ' alt="' + cat.name + '的照片 ' + (imageIndex + 1) + '" decoding="async">';
          }).join("") + '</div>' +
          (images.length > 1
            ? '<button class="dialog-photo-nav dialog-photo-prev" type="button" data-dialog-photo-direction="-1" aria-label="上一张照片" title="上一张"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>' +
              '<button class="dialog-photo-nav dialog-photo-next" type="button" data-dialog-photo-direction="1" aria-label="下一张照片" title="下一张"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>' +
              '<div class="dialog-photo-pagination" aria-label="照片页码">' + images.map(function (_, imageIndex) {
                return '<button type="button" data-dialog-photo-index="' + imageIndex + '" aria-label="查看第 ' + (imageIndex + 1) + ' 张照片" aria-current="' + (imageIndex === 0) + '" class="' + (imageIndex === 0 ? 'is-active' : '') + '"></button>';
              }).join("") + '</div>'
            : '') +
        '</div>'
      : '<span class="dialog-photo-placeholder"><i>ฅ</i><b>' + cat.name + '照片待补充</b></span>';
    var effectName = ["peek", "bounce", "tilt", "float"][index % 4];
    var specialMarkup = cat.introEffect === "big-face"
      ? '<div class="cat-intro-effect" aria-hidden="true"><img data-src="assets/images/surprises/zuoxiajiao-surprise-cutout.png" data-sizes="(max-width: 720px) 92vw, 620px" alt="" decoding="async"></div>'
      : "";
    var biographyMarkup = getStoryBlocks(cat).map(function (block) {
      if (block.image) {
        return '<img class="dialog-story-image" ' + responsiveImageAttributes(block.image, "(max-width: 720px) 88vw, 560px", true) + ' alt="' + cat.name + '的猫咪小传配图">';
      }
      return "<p>" + block.text + "</p>";
    }).join("");
    var personalityMarkup = splitStoryText(cat.personality).map(function (text) {
      return "<p>" + text + "</p>";
    }).join("");
    document.getElementById("dialogContent").innerHTML =
      '<div class="dialog-image cat-effect-host effect-' + effectName + '">' + imageMarkup + specialMarkup + '<span>' + cat.type + "</span></div>" +
      '<div class="dialog-copy"><small>' + cat.title + "</small><h3>" + cat.name + "</h3>" +
      '<blockquote class="dialog-signature">' + cat.quote + "</blockquote>" +
      '<section><h4>猫咪小传</h4>' + biographyMarkup + "</section>" +
      '<section><h4>你可能是</h4>' + personalityMarkup + "</section></div>";
    var dialog = document.getElementById("catDialog");
    var host = document.querySelector(".dialog-image");
    prepareCatIntroEffect(host, cat);
    dialog.showModal();
    runWhenIdle(function () {
      hydrateDeferredImages(dialog.querySelector(".dialog-copy"), undefined, { priority: "idle" });
    }, 900);
    var dialogTrack = host.querySelector(".dialog-photo-track");
    if (dialogTrack) {
      dialogTrack.addEventListener("scroll", function () {
        if (dialogTrack.clientWidth) {
          updateDialogPhotoPagination(host, Math.round(dialogTrack.scrollLeft / dialogTrack.clientWidth));
        }
      }, { passive: true });
    }
    window.requestAnimationFrame(function () {
      host.classList.add("is-playing-dialog-effect");
      playCatIntroEffect(host, cat, "dialog");
    });
  }

  function closeDialog() {
    document.getElementById("catDialog").close();
  }

  coverPeekController = window.CATBTI_FEATURES.createCoverPeekController({
    runtime: runtime,
    prefersReducedMotion: prefersReducedMotion
  });
  fateTransitionController = window.CATBTI_EFFECTS.createFateTransitionController({
    runtime: runtime,
    audioSource: "assets/audio/transitions/fate-dice-transition.wav?v=20260731-fate2",
    prefersReducedMotion: prefersReducedMotion,
    warmSurpriseImages: warmDazuoSurpriseImages,
    renderResult: renderResult
  });
  quizController = window.CATBTI_FEATURES.createQuizController({
    config: config,
    matcher: window.CATBTI_MATCHER,
    runWhenIdle: runWhenIdle,
    showView: showView,
    getFateController: function () { return fateTransitionController; },
    surpriseChance: 0.5,
    resetResultTimers: function () {
      window.clearTimeout(receiptTimer);
      window.clearTimeout(surpriseDelayTimer);
    }
  });
  dankeQueenController = window.CATBTI_EFFECTS.createDankeQueenController({
    warmImages: warmDankeQueenImages,
    playEntrySound: function () { playMeowNow(560, 0.24); },
    interactionAudioSource: "assets/audio/interactions/danke-interact.mp3"
  });
  duoSurpriseController = window.CATBTI_EFFECTS.createDuoSurpriseController({
    warmImages: warmDazuoSurpriseImages,
    playOpeningSound: playDazuoSound,
    playCatMeowAudio: playCatMeowAudio,
    playGiftHintSound: playGiftHintSound,
    playButtonClickSound: playButtonClickSound,
    dazuoAudioSource: "assets/audio/interactions/dazuo-interact.mp3",
    labaAudioSource: "assets/audio/interactions/laba-interact.mp3"
  });

  fillConfiguredContent();
  renderGallery();
  document.body.dataset.view = "home";
  var heroCoverImage = document.querySelector(".hero-cover-frame img[data-src]");
  if (heroCoverImage) {
    loadImageElement(heroCoverImage, heroCoverImage.dataset.src, {
      priority: "high",
      sizes: "(max-width: 760px) 92vw, 620px"
    });
  }

  var previewType = new URLSearchParams(window.location.search).get("result");
  var previewAliases = {
    EATR: "EATER",
    QUEEN: "KISS",
    FREE: "DEVIL",
    LYFE: "CHIL",
    RUNER: "RUNNER",
    GENT: "BOSS"
  };
  var normalizedPreviewType = previewAliases[previewType] || previewType;
  var previewCat = config.cats.find(function (cat) { return cat.type === normalizedPreviewType; });
  if (previewCat) {
    var previewParams = new URLSearchParams(window.location.search);
    if (previewParams.get("transition") === "1") {
      var previewFate = fateTransitionController.getForcedOutcome();
      window.setTimeout(function () {
        fateTransitionController.start({
          cat: previewCat,
          traits: {},
          secretSurprise: previewFate === null ? Math.random() < secretSurpriseChance : previewFate
        });
      }, 80);
    } else {
      renderResult(previewCat);
    }
  }
  else if (window.location.hash === "#cats") showView("gallery");

  document.getElementById("startButton").addEventListener("click", function () { quizController.start(true); });
  document.getElementById("homeGalleryButton").addEventListener("click", function () {
    galleryReturnView = "home";
    document.getElementById("galleryBackLabel").textContent = "返回首页";
    document.getElementById("galleryBackButton").hidden = false;
    showView("gallery");
  });
  document.getElementById("galleryShortcut").addEventListener("click", function () {
    galleryReturnView = null;
    document.getElementById("galleryBackButton").hidden = true;
    showView("gallery");
  });
  document.getElementById("resultGalleryButton").addEventListener("click", function () {
    galleryReturnView = "result";
    document.getElementById("galleryBackLabel").textContent = "返回测试结果";
    document.getElementById("galleryBackButton").hidden = false;
    showView("gallery");
  });
  document.getElementById("galleryBackButton").addEventListener("click", function () {
    if (!galleryReturnView) return;
    showView(galleryReturnView);
  });
  document.getElementById("retryButton").addEventListener("click", function () { quizController.start(true); });
  document.getElementById("resultTitle").addEventListener("click", function (event) {
    dankeQueenController.pressTrigger(event.currentTarget);
  });
  document.getElementById("resultTitle").addEventListener("pointerenter", function (event) {
    if (event.currentTarget.classList.contains("is-danke-trigger")) warmDankeQueenImages();
  }, { passive: true });
  document.getElementById("resultTitle").addEventListener("pointerdown", function (event) {
    if (event.currentTarget.classList.contains("is-danke-trigger")) warmDankeQueenImages();
  }, { passive: true });
  document.getElementById("resultTitle").addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!event.currentTarget.classList.contains("is-danke-trigger")) return;
    event.preventDefault();
    dankeQueenController.pressTrigger(event.currentTarget);
  });
  document.querySelector(".danke-queen-cat").addEventListener("click", dankeQueenController.interact);
  document.getElementById("photoPrev").addEventListener("click", function () { showPhoto(currentPhotoIndex - 1); });
  document.getElementById("photoNext").addEventListener("click", function () { showPhoto(currentPhotoIndex + 1); });
  document.getElementById("photoPagination").addEventListener("click", function (event) {
    var button = event.target.closest("[data-photo-index]");
    if (button) showPhoto(Number(button.dataset.photoIndex));
  });
  document.getElementById("resultPhotoTrack").addEventListener("scroll", function (event) {
    var track = event.currentTarget;
    if (track.clientWidth) {
      var nextIndex = Math.round(track.scrollLeft / track.clientWidth);
      updatePhotoPagination(nextIndex);
      preloadNearbyResultPhotos(nextIndex);
    }
  }, { passive: true });
  duoSurpriseController.bind(
    document.getElementById("dazuoSurprise"),
    function () { return document.querySelector(".result-portrait-wrap"); }
  );
  document.getElementById("testBackButton").addEventListener("click", quizController.previous);
  document.getElementById("optionList").addEventListener("click", function (event) {
    var button = event.target.closest("[data-option]");
    if (button) quizController.select(Number(button.dataset.option));
  });
  document.getElementById("catGrid").addEventListener("click", function (event) {
    var card = event.target.closest("[data-cat-index]");
    if (card) openCatDialog(Number(card.dataset.catIndex));
  });
  document.getElementById("dialogContent").addEventListener("click", function (event) {
    var host = event.target.closest(".dialog-image");
    if (!host) return;
    var directionButton = event.target.closest("[data-dialog-photo-direction]");
    if (directionButton) {
      showDialogPhoto(host, Number(host.dataset.photoIndex || 0) + Number(directionButton.dataset.dialogPhotoDirection));
      return;
    }
    var paginationButton = event.target.closest("[data-dialog-photo-index]");
    if (paginationButton) showDialogPhoto(host, Number(paginationButton.dataset.dialogPhotoIndex));
  });
  document.getElementById("dialogClose").addEventListener("click", closeDialog);
  document.getElementById("catDialog").addEventListener("click", function (event) {
    if (event.target === event.currentTarget) closeDialog();
  });
  document.querySelectorAll("[data-route='home']").forEach(function (button) {
    button.addEventListener("click", function () { showView("home"); });
  });
  window.addEventListener("hashchange", function () {
    if (window.location.hash === "#cats") showView("gallery");
  });
  coverPeekController.init();
})();
