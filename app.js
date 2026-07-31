(function () {
  "use strict";

  var config = window.CATBTI_CONFIG;
  var views = Array.from(document.querySelectorAll(".view"));
  var currentQuestion = 0;
  var answers = {};
  var transitionTimer = null;
  var audioContext = null;
  var surpriseTimer = null;
  var surpriseDelayTimer = null;
  var giftHintTimer = null;
  var surpriseInteractionTimer = null;
  var surpriseSettleTimer = null;
  var currentSurpriseAudio = null;
  var surpriseAudioCache = {};
  var receiptTimer = null;
  var currentPhotoIndex = 0;
  var currentPhotoCount = 0;
  var resultPhotoImages = [];
  var currentResultCat = null;
  var galleryReturnView = null;
  var galleryImageObserver = null;
  var catIntroTimer = null;
  var dialogEffectTimer = null;
  var dankeQueenTimer = null;
  var dankeQueenEntryTimer = null;
  var dankeQueenInteractTimer = null;
  var dankeQueenParticleTimer = null;
  var currentDankeQueenAudio = null;
  var fateTransitionTimers = [];
  var fateTransitionAudio = null;
  var fateTransitionInProgress = false;
  var discPeekResizeFrame = null;
  var discPeekShowTimer = null;
  var discPeekHideTimer = null;
  var discPeekActiveCat = null;
  var discPeekLastCat = null;
  var discPeekAngles = [-165, -150, -135, -120, -105, -90, -75, -60, -45, -30, -15];
  var discPeekStates = {
    dazuo: { angle: null, lastAngle: null, firstAngle: -90, contactX: 0.485, widthRatio: 0.219, coverInsetRatio: 0.56 },
    laba: { angle: null, lastAngle: null, firstAngle: -15, contactX: 0.496, widthRatio: 0.231, coverInsetRatio: 0.57 }
  };
  var receiptPrintDuration = 2800;
  var secretSurpriseChance = 0.5;

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
    if (name === "home") resumeDiscPeeks(650);
    else suspendDiscPeek();
    if (name === "gallery") {
      hydrateDeferredImages(document.querySelector(".student-guide"), 1);
      primeGalleryImages(6);
    }
    window.scrollTo(0, 0);
    document.getElementById("app").focus({ preventScroll: true });
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function randomDiscPeekDelay(minimum, maximum) {
    return minimum + Math.round(Math.random() * (maximum - minimum));
  }

  function getDiscPeek(catKey) {
    return document.querySelector('[data-peek-cat="' + catKey + '"]');
  }

  function angleDistance(first, second) {
    var difference = Math.abs(first - second) % 360;
    return Math.min(difference, 360 - difference);
  }

  function chooseDiscPeekAngle(catKey) {
    var state = discPeekStates[catKey];

    if (state.firstAngle !== null) {
      var firstAngle = state.firstAngle;
      state.firstAngle = null;
      return firstAngle;
    }

    var candidates = discPeekAngles.filter(function (angle) {
      var differentFromLast = state.lastAngle === null || angleDistance(angle, state.lastAngle) >= 42;
      return differentFromLast;
    });
    if (!candidates.length) candidates = discPeekAngles.slice();
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function clampDiscPeekSize(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function getDiscPeekWidth(catKey, frameSize) {
    var state = discPeekStates[catKey];
    var minimum = catKey === "laba" ? 72 : 68;
    var maximum = catKey === "laba" ? 112 : 106;
    return clampDiscPeekSize(frameSize * state.widthRatio, minimum, maximum);
  }

  function layoutDiscPeek(catKey) {
    var peek = getDiscPeek(catKey);
    var state = discPeekStates[catKey];
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
    var width = getDiscPeekWidth(catKey, frameSize);
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

  function chooseNextDiscPeekCat() {
    if (!discPeekLastCat) return "dazuo";
    return discPeekLastCat === "dazuo" ? "laba" : "dazuo";
  }

  function scheduleDiscPeek(delay) {
    window.clearTimeout(discPeekShowTimer);
    if (document.body.dataset.view !== "home" || prefersReducedMotion()) return;
    discPeekShowTimer = window.setTimeout(function () {
      showRandomDiscPeek(chooseNextDiscPeekCat());
    }, delay);
  }

  function showRandomDiscPeek(catKey) {
    var peek = getDiscPeek(catKey);
    var state = discPeekStates[catKey];
    if (!peek || discPeekActiveCat || document.body.dataset.view !== "home" || prefersReducedMotion()) return;
    if (document.hidden) {
      scheduleDiscPeek(600);
      return;
    }

    state.angle = chooseDiscPeekAngle(catKey);
    if (!layoutDiscPeek(catKey)) {
      scheduleDiscPeek(300);
      return;
    }
    discPeekActiveCat = catKey;
    discPeekLastCat = catKey;
    peek.classList.remove("is-hiding", "is-visible");
    peek.setAttribute("aria-hidden", "false");
    peek.tabIndex = 0;
    void peek.offsetWidth;
    peek.classList.add("is-visible");

    window.clearTimeout(discPeekHideTimer);
    discPeekHideTimer = window.setTimeout(function () {
      hideDiscPeek(catKey, false);
    }, randomDiscPeekDelay(5200, 7200));
  }

  function hideDiscPeek(catKey, wasTapped) {
    var peek = getDiscPeek(catKey);
    var state = discPeekStates[catKey];
    if (!peek || !peek.classList.contains("is-visible")) return;

    window.clearTimeout(discPeekHideTimer);
    peek.classList.remove("is-visible");
    peek.classList.add("is-hiding");
    peek.setAttribute("aria-hidden", "true");
    peek.tabIndex = -1;
    state.lastAngle = state.angle;
    discPeekHideTimer = window.setTimeout(function () {
      peek.classList.remove("is-hiding");
      state.angle = null;
      discPeekActiveCat = null;
      scheduleDiscPeek(wasTapped ? randomDiscPeekDelay(700, 1200) : randomDiscPeekDelay(1500, 2600));
    }, 190);
  }

  function suspendDiscPeek() {
    window.clearTimeout(discPeekShowTimer);
    window.clearTimeout(discPeekHideTimer);
    Object.keys(discPeekStates).forEach(function (catKey) {
      var state = discPeekStates[catKey];
      var peek = getDiscPeek(catKey);
      state.angle = null;
      if (!peek) return;
      peek.classList.remove("is-visible", "is-hiding");
      peek.setAttribute("aria-hidden", "true");
      peek.tabIndex = -1;
    });
    discPeekActiveCat = null;
  }

  function resumeDiscPeeks(delay) {
    if (discPeekActiveCat) return;
    runWhenIdle(function () {
      hydrateDeferredImages(document.querySelector(".hero-visual"));
    }, 1200);
    scheduleDiscPeek(delay);
  }

  function pointerIsOutsideCover(event) {
    var frame = document.querySelector(".hero-cover-frame");
    if (!frame) return false;
    var frameRect = frame.getBoundingClientRect();
    var centerX = frameRect.left + frameRect.width / 2;
    var centerY = frameRect.top + frameRect.height / 2;
    var distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
    return distance >= frame.offsetWidth * 0.496 - 1;
  }

  function initDiscPeek() {
    var desktopHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    document.querySelectorAll("[data-peek-cat]").forEach(function (peek) {
      var catKey = peek.dataset.peekCat;
      var hideOnDesktopHover = function (event) {
        if (event.pointerType !== "mouse" || !desktopHover.matches || !peek.classList.contains("is-visible")) return;
        if (!pointerIsOutsideCover(event)) return;
        hideDiscPeek(catKey, true);
      };
      peek.addEventListener("pointerenter", hideOnDesktopHover);
      peek.addEventListener("pointermove", hideOnDesktopHover);
      peek.addEventListener("click", function (event) {
        if (!peek.classList.contains("is-visible")) return;
        event.preventDefault();
        hideDiscPeek(catKey, true);
      });
      peek.querySelector("img").addEventListener("load", function () {
        if (discPeekStates[catKey].angle !== null) layoutDiscPeek(catKey);
      });
    });
    window.addEventListener("resize", function () {
      window.cancelAnimationFrame(discPeekResizeFrame);
      discPeekResizeFrame = window.requestAnimationFrame(function () {
        if (discPeekActiveCat) layoutDiscPeek(discPeekActiveCat);
      });
    });
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        if (discPeekActiveCat) layoutDiscPeek(discPeekActiveCat);
      }).observe(document.querySelector(".hero-cover-frame"));
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) suspendDiscPeek();
      else if (document.body.dataset.view === "home") resumeDiscPeeks(500);
    });
    resumeDiscPeeks(700);
  }

  function startTest(reset) {
    window.clearTimeout(receiptTimer);
    window.clearTimeout(surpriseDelayTimer);
    resetFateTransition();
    if (reset) answers = {};
    currentQuestion = 0;
    showView("test");
    renderQuestion();
  }

  function getQuestionById(id) {
    return config.questions.find(function (question) { return question.id === id; });
  }

  function getAnswerValue(id) {
    var question = getQuestionById(id);
    var answerIndex = answers[id];
    return question && answerIndex !== undefined ? question.options[answerIndex].value : null;
  }

  function getMajority(ids, firstValue, secondValue) {
    return window.CATBTI_MATCHER.getMajority(ids.map(getAnswerValue), firstValue, secondValue);
  }

  function calculateTraits() {
    var aspiration = getAnswerValue("aspiration");
    var pursuit = aspiration === "food" ? "food" : null;
    if (aspiration === "social") pursuit = getAnswerValue("pursuit-social");
    if (aspiration === "autonomy") pursuit = getAnswerValue("pursuit-autonomy");

    return {
      attitude: getMajority(["attitude-1", "attitude-2", "attitude-3"], "friendly", "cautious"),
      action: getMajority(["action-1", "action-2", "action-3"], "active", "observer"),
      area: getAnswerValue("area"),
      pursuit: pursuit
    };
  }

  function traitsMatch(left, right) {
    return ["attitude", "action", "area", "pursuit"].every(function (key) {
      return left[key] && left[key] === right[key];
    });
  }

  function getVisibleQuestions() {
    var ids = config.flow.base.slice();
    var aspiration = getAnswerValue("aspiration");
    var pursuitQuestion = config.flow.pursuitBranches[aspiration];
    if (pursuitQuestion) ids.push(pursuitQuestion);

    var traits = calculateTraits();
    if (traitsMatch(traits, config.flow.special.traits)) ids.push(config.flow.special.question);
    return ids.map(getQuestionById);
  }

  function renderQuestion() {
    var visibleQuestions = getVisibleQuestions();
    var question = visibleQuestions[currentQuestion];
    var total = visibleQuestions.length;
    var percent = Math.round(((currentQuestion + 1) / total) * 100);
    var panel = document.getElementById("questionPanel");

    document.getElementById("progressLabel").textContent = "进度 " + (currentQuestion + 1) + " / " + total;
    document.getElementById("progressPercent").textContent = percent + "%";
    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("questionNumber").textContent = question.dimension.toUpperCase() + " / QUESTION " + String(currentQuestion + 1).padStart(2, "0");
    document.getElementById("questionTitle").textContent = question.text;
    document.getElementById("testBackButton").disabled = currentQuestion === 0;
    if (currentQuestion >= Math.max(0, total - 2)) {
      runWhenIdle(warmFateTransitionAssets, 480);
    }

    document.getElementById("optionList").innerHTML = question.options.map(function (option, index) {
      var selected = answers[question.id] === index;
      var catStyle = (currentQuestion * 2 + index) % 8;
      return '<button class="option-button' + (selected ? " is-selected" : "") + '" type="button" role="radio" aria-checked="' + selected + '" data-option="' + index + '">' +
        '<span class="option-cat cat-style-' + catStyle + '" aria-hidden="true"><span class="cat-face"><i></i><i></i><b></b></span></span>' +
        '<span class="option-text">' + option.text + "</span>" +
        '<span class="option-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span>' +
        "</button>";
    }).join("");

    panel.classList.remove("question-enter");
    void panel.offsetWidth;
    panel.classList.add("question-enter");
  }

  function selectAnswer(index) {
    window.clearTimeout(transitionTimer);
    var question = getVisibleQuestions()[currentQuestion];
    answers[question.id] = index;
    document.querySelectorAll(".option-button").forEach(function (button, buttonIndex) {
      var selected = buttonIndex === index;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-checked", String(selected));
    });

    var visibleQuestions = getVisibleQuestions();
    if (currentQuestion >= visibleQuestions.length - 1) {
      startFateTransition(calculateResult());
      return;
    }

    transitionTimer = window.setTimeout(function () {
      var nextQuestions = getVisibleQuestions();
      if (currentQuestion < nextQuestions.length - 1) {
        currentQuestion += 1;
        renderQuestion();
      }
    }, 360);
  }

  function previousQuestion() {
    window.clearTimeout(transitionTimer);
    if (currentQuestion === 0) return;
    currentQuestion -= 1;
    renderQuestion();
  }

  function calculateResult() {
    var traits = calculateTraits();
    var specialChoice = getAnswerValue(config.flow.special.question);
    var forcedFate = getForcedFateOutcome();
    return {
      cat: window.CATBTI_MATCHER.matchCat(config, traits, specialChoice),
      traits: traits,
      secretSurprise: forcedFate === null ? Math.random() < secretSurpriseChance : forcedFate
    };
  }

  function getForcedFateOutcome() {
    var params = new URLSearchParams(window.location.search);
    var fate = (params.get("fate") || "").toLowerCase();
    if (fate === "hit" || fate === "success") return true;
    if (fate === "miss" || fate === "fail") return false;
    if (params.get("surprise") === "1") return true;
    if (params.get("surprise") === "0") return false;
    return null;
  }

  function shouldShowSecretSurprise(result) {
    var forcedFate = getForcedFateOutcome();
    return forcedFate === null ? Boolean(result.secretSurprise) : forcedFate;
  }

  function getFateTransitionAudio() {
    if (!fateTransitionAudio) {
      fateTransitionAudio = new Audio("audio/fate-dice-transition.wav?v=20260731-fate2");
      fateTransitionAudio.preload = "auto";
      fateTransitionAudio.volume = 0.72;
    }
    return fateTransitionAudio;
  }

  function warmFateTransitionAssets() {
    hydrateDeferredImages(document.getElementById("fateTransition"));
    var soundtrack = getFateTransitionAudio();
    if (soundtrack.readyState === 0) soundtrack.load();
  }

  function playFateTransitionAudio() {
    var soundtrack = getFateTransitionAudio();
    soundtrack.pause();
    soundtrack.currentTime = 0;
    soundtrack.volume = 0.72;
    var playPromise = soundtrack.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {
        document.body.dataset.fateAudio = "blocked";
      });
    }
  }

  function stopFateTransitionAudio() {
    if (!fateTransitionAudio) return;
    fateTransitionAudio.pause();
    fateTransitionAudio.currentTime = 0;
  }

  function clearFateTransitionTimers() {
    fateTransitionTimers.forEach(window.clearTimeout);
    fateTransitionTimers = [];
  }

  function scheduleFateTransition(callback, delay) {
    var timer = window.setTimeout(callback, delay);
    fateTransitionTimers.push(timer);
    return timer;
  }

  function resetFateTransition() {
    clearFateTransitionTimers();
    stopFateTransitionAudio();
    fateTransitionInProgress = false;
    document.body.classList.remove("is-fate-transition-open");
    var transition = document.getElementById("fateTransition");
    if (!transition) return;
    transition.classList.remove("is-active", "is-rolling", "is-revealed", "is-hit", "is-miss");
    transition.setAttribute("aria-hidden", "true");
    var outcome = document.getElementById("fateOutcome");
    if (outcome) outcome.textContent = "";
  }

  function finishFateTransition(result) {
    var transition = document.getElementById("fateTransition");
    renderResult(result);
    document.body.classList.remove("is-fate-transition-open");
    if (transition) {
      transition.classList.remove("is-active");
      transition.setAttribute("aria-hidden", "true");
    }
    scheduleFateTransition(function () {
      if (transition) transition.classList.remove("is-rolling", "is-revealed", "is-hit", "is-miss");
      fateTransitionInProgress = false;
      stopFateTransitionAudio();
    }, 380);
  }

  function startFateTransition(result) {
    if (!result || fateTransitionInProgress) return;
    var transition = document.getElementById("fateTransition");
    var outcome = document.getElementById("fateOutcome");
    if (!transition || !outcome) {
      renderResult(result);
      return;
    }

    clearFateTransitionTimers();
    warmFateTransitionAssets();
    if (result.secretSurprise) warmDazuoSurpriseImages();
    fateTransitionInProgress = true;
    document.body.classList.add("is-fate-transition-open");
    transition.classList.remove("is-rolling", "is-revealed", "is-hit", "is-miss");
    transition.setAttribute("aria-hidden", "false");
    outcome.textContent = "";
    void transition.offsetWidth;
    transition.classList.add("is-active", "is-rolling");

    var reducedMotion = prefersReducedMotion();
    if (!reducedMotion) playFateTransitionAudio();

    var revealDelay = reducedMotion ? 280 : 4250;
    var finishDelay = reducedMotion ? 980 : (result.secretSurprise ? 5450 : 6500);

    scheduleFateTransition(function () {
      transition.classList.add("is-revealed");
      if (result.secretSurprise) {
        transition.classList.add("is-hit");
        outcome.textContent = "它们来了！";
      } else {
        transition.classList.add("is-miss");
        outcome.textContent = "啊哦~大佐喇叭逃跑了🐱";
      }
    }, revealDelay);

    scheduleFateTransition(function () {
      finishFateTransition(result);
    }, finishDelay);
  }

  function getCatImages(cat) {
    if (cat.imagePending) return [];
    return cat.images && cat.images.length ? cat.images : (cat.image ? [cat.image] : []);
  }

  function setDeferredImageSource(image) {
    if (!image || !image.dataset || !image.dataset.src || image.src) return false;
    image.src = image.dataset.src;
    image.removeAttribute("data-src");
    return true;
  }

  function hydrateDeferredImages(root, limit) {
    if (!root) return;
    Array.from(root.querySelectorAll("img[data-src]")).slice(0, limit || undefined).forEach(setDeferredImageSource);
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

  function preloadResultPhoto(index) {
    if (!resultPhotoImages.length) return;
    var normalizedIndex = (index + resultPhotoImages.length) % resultPhotoImages.length;
    var image = document.querySelector('#resultPhotoTrack img[data-photo-index="' + normalizedIndex + '"]');
    if (image) setDeferredImageSource(image);
  }

  function preloadNearbyResultPhotos(index) {
    if (!resultPhotoImages.length) return;
    preloadResultPhoto(index);
    runWhenIdle(function () {
      preloadResultPhoto(index + 1);
      if (resultPhotoImages.length > 2) preloadImage(resultPhotoImages[(index + 2) % resultPhotoImages.length]);
    }, 520);
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
          setDeferredImageSource(entry.target);
          galleryImageObserver.unobserve(entry.target);
        });
      }, { rootMargin: "260px 0px" });
    }
    images.forEach(function (image) { galleryImageObserver.observe(image); });
  }

  function primeGalleryImages(count) {
    hydrateDeferredImages(document.getElementById("catGrid"), count || 6);
    initGalleryLazyImages();
  }

  function warmDazuoSurpriseImages() {
    hydrateDeferredImages(document.getElementById("dazuoSurprise"));
  }

  function warmDankeQueenImages() {
    hydrateDeferredImages(document.getElementById("dankeQueenPop"));
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
      var sourceAttribute = index === 0 ? 'src="' + image + '"' : 'data-src="' + image + '"';
      var priority = index === 0 ? ' fetchpriority="high"' : ' loading="lazy"';
      return '<img ' + sourceAttribute + ' data-photo-index="' + index + '" alt="' + cat.name + '的照片 ' + (index + 1) + '" decoding="async"' + priority + ' style="object-fit:contain">';
    }).join("") : '<div class="photo-placeholder" role="img" aria-label="' + cat.name + '的照片待补充"><span>ฅ</span><strong>' + cat.name + '</strong><small>照片待补充</small></div>';
    pagination.innerHTML = images.map(function (_, index) {
      return '<button type="button" data-photo-index="' + index + '" aria-label="查看第 ' + (index + 1) + ' 张照片" aria-current="' + (index === 0) + '"></button>';
    }).join("");
    portrait.classList.toggle("has-single-photo", images.length <= 1);
    portrait.classList.toggle("has-multiple-photos", images.length > 1);
    portrait.classList.toggle("has-pending-photo", images.length === 0);
    track.scrollLeft = 0;
    updatePhotoPagination(0);
    if (images.length > 1) preloadNearbyResultPhotos(0);
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
      if (effectImage) effectImage.src = "images/updated-cats/zuoxiajiao-surprise-cutout.png";
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
        image.src = block.image;
        image.loading = "lazy";
        image.decoding = "async";
        image.alt = cat.name + "的猫咪小传配图";
        image.width = block.width;
        image.height = block.height;
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
    var showSecretSurprise = shouldShowSecretSurprise(result);

    currentResultCat = cat;
    window.clearTimeout(catIntroTimer);
    resultType.textContent = cat.type;
    resultType.dataset.length = cat.type.length;
    document.getElementById("resultTitle").textContent = cat.title;
    configureDankeQueenTrigger(cat);
    document.getElementById("resultBarcodeCode").textContent = "CATBTI · " + cat.type;
    renderPhotoCarousel(cat);
    prepareCatIntroEffect(document.querySelector(".result-photo-stage"), cat);
    document.getElementById("resultStamp").textContent = cat.type;
    document.getElementById("resultCatName").textContent = cat.name;
    renderPersonality(cat);
    renderStory(cat);
    document.getElementById("resultQuote").textContent = cat.quote;
    resetDankeQueenPop();
    window.clearTimeout(surpriseTimer);
    window.clearTimeout(surpriseDelayTimer);
    window.clearTimeout(giftHintTimer);
    portrait.classList.remove("is-secret-surprise", "is-playing-surprise", "is-surprise-complete");
    document.body.classList.remove("is-secret-surprise-open");
    surprise.classList.remove("is-active", "is-ready");
    surprise.setAttribute("aria-hidden", "true");
    showView("result");
    startReceiptPrint();
    if (cat.type === "KISS") {
      runWhenIdle(warmDankeQueenImages, 1600);
    }
    if (showSecretSurprise) {
      runWhenIdle(warmDazuoSurpriseImages, 360);
      surpriseDelayTimer = window.setTimeout(function () {
        prepareDazuoSurprise(surprise, portrait);
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
    var meow = new Audio("audio/cat-meow.mp3");
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

  function playSurpriseCatAudio(catKey) {
    var source = catKey === "dazuo" ? "audio/dazuo-interact.mp3" : "audio/laba-interact.mp3";
    if (currentSurpriseAudio) {
      currentSurpriseAudio.pause();
      currentSurpriseAudio.currentTime = 0;
    }
    warmSurpriseCatAudio(catKey);
    currentSurpriseAudio = surpriseAudioCache[catKey];
    currentSurpriseAudio.currentTime = 0;
    currentSurpriseAudio.volume = catKey === "dazuo" ? 0.72 : 0.68;
    document.body.dataset.surpriseCatAudio = catKey + "-starting";
    return currentSurpriseAudio.play().then(function () {
      document.body.dataset.surpriseCatAudio = catKey + "-playing";
      return true;
    }).catch(function () {
      document.body.dataset.surpriseCatAudio = catKey + "-blocked";
      return false;
    });
  }

  function warmSurpriseCatAudio(catKey) {
    var source = catKey === "dazuo" ? "audio/dazuo-interact.mp3" : "audio/laba-interact.mp3";
    if (!surpriseAudioCache[catKey]) {
      surpriseAudioCache[catKey] = new Audio(source);
      surpriseAudioCache[catKey].preload = "auto";
    }
    if (surpriseAudioCache[catKey].readyState === 0) surpriseAudioCache[catKey].load();
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

  function updateSurpriseCaption(surprise, text) {
    var caption = surprise && surprise.querySelector("#surpriseCaption");
    var copy = caption && caption.querySelector(".surprise-caption-copy");
    if (copy) {
      copy.textContent = text;
    } else if (caption) {
      caption.textContent = text;
    }
  }

  function resetDazuoSurprise(surprise) {
    if (!surprise) return;
    surprise.classList.remove("is-active", "is-ready", "is-cats-settled", "is-dazuo-push", "is-laba-push", "is-dazuo-speak", "is-laba-speak", "is-ending");
    surprise.dataset.dazuoClicked = "";
    surprise.dataset.labaClicked = "";
    updateSurpriseCaption(surprise, "礼盒里好像有猫在讲话……");
    var endButton = surprise.querySelector("#surpriseEndButton");
    if (endButton) endButton.classList.remove("is-pressing");
  }

  function completeDazuoSurprise(surprise, portrait) {
    window.clearTimeout(surpriseTimer);
    window.clearTimeout(giftHintTimer);
    window.clearTimeout(surpriseInteractionTimer);
    window.clearTimeout(surpriseSettleTimer);
    if (currentSurpriseAudio) {
      currentSurpriseAudio.pause();
      currentSurpriseAudio.currentTime = 0;
    }
    portrait.classList.remove("is-playing-surprise");
    portrait.classList.add("is-surprise-complete");
    document.body.classList.remove("is-secret-surprise-open");
    resetDazuoSurprise(surprise);
    surprise.setAttribute("aria-hidden", "true");
  }

  function startDazuoSurprise(surprise, portrait) {
    if (!surprise || !portrait || portrait.classList.contains("is-playing-surprise")) return;
    window.clearTimeout(surpriseTimer);
    window.clearTimeout(giftHintTimer);
    window.clearTimeout(surpriseInteractionTimer);
    portrait.classList.remove("is-surprise-complete");
    portrait.classList.add("is-playing-surprise");
    document.body.classList.add("is-secret-surprise-open");
    resetDazuoSurprise(surprise);
    void surprise.offsetWidth;
    surprise.classList.add("is-active");
    surprise.setAttribute("aria-hidden", "false");
    updateSurpriseCaption(surprise, "礼盒里好像有猫在讲话……");
    playDazuoSound();
    playCatMeowAudio();
    surpriseSettleTimer = window.setTimeout(function () {
      surprise.classList.add("is-cats-settled");
    }, 2250);
  }

  function prepareDazuoSurprise(surprise, portrait) {
    if (!surprise || !portrait) return;
    if (surprise.parentElement !== document.body) {
      document.body.appendChild(surprise);
    }
    warmDazuoSurpriseImages();
    portrait.classList.add("is-secret-surprise");
    document.body.classList.add("is-secret-surprise-open");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      completeDazuoSurprise(surprise, portrait);
      return;
    }

    surprise.setAttribute("aria-hidden", "false");
    resetDazuoSurprise(surprise);
    ["dazuo", "laba"].forEach(warmSurpriseCatAudio);
    void surprise.offsetWidth;
    surprise.classList.add("is-ready");
    playGiftHintSound();
    giftHintTimer = window.setTimeout(function () {
      if (surprise.classList.contains("is-ready")) playGiftHintSound();
    }, 1650);
  }

  function interactWithSurpriseCat(surprise, catKey) {
    if (!surprise || !surprise.classList.contains("is-active")) return;
    window.clearTimeout(surpriseInteractionTimer);
    surprise.classList.remove("is-dazuo-push", "is-laba-push", "is-dazuo-speak", "is-laba-speak");
    void surprise.offsetWidth;
    if (catKey === "dazuo") {
      surprise.dataset.dazuoClicked = "1";
      surprise.classList.add("is-dazuo-push", "is-dazuo-speak");
      updateSurpriseCaption(surprise, "大佐：偶是一枚风度翩翩的绅士吖");
      playSurpriseCatAudio("dazuo");
    } else {
      surprise.dataset.labaClicked = "1";
      surprise.classList.add("is-laba-push", "is-laba-speak");
      updateSurpriseCaption(surprise, "喇叭：橘猫体型优势，启动。");
      playSurpriseCatAudio("laba");
    }
    surpriseInteractionTimer = window.setTimeout(function () {
      surprise.classList.remove("is-dazuo-push", "is-laba-push");
    }, 560);
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

  function endDazuoSurprise(surprise, portrait) {
    var endButton = surprise && surprise.querySelector("#surpriseEndButton");
    if (endButton) endButton.classList.add("is-pressing");
    playButtonClickSound();
    window.clearTimeout(surpriseTimer);
    surpriseTimer = window.setTimeout(function () {
      if (surprise) surprise.classList.add("is-ending");
    }, 90);
    surpriseTimer = window.setTimeout(function () {
      if (endButton) endButton.classList.remove("is-pressing");
      completeDazuoSurprise(surprise, portrait);
    }, 360);
  }

  function resetDankeQueenPop() {
    var pop = document.getElementById("dankeQueenPop");
    window.clearTimeout(dankeQueenTimer);
    window.clearTimeout(dankeQueenEntryTimer);
    window.clearTimeout(dankeQueenInteractTimer);
    window.clearTimeout(dankeQueenParticleTimer);
    if (pop) pop.classList.remove("is-queen-speaking", "is-queen-entering", "is-queen-interacting", "is-queen-bursting");
    document.body.classList.remove("is-danke-queen-open");
    if (currentDankeQueenAudio) {
      currentDankeQueenAudio.pause();
      currentDankeQueenAudio.currentTime = 0;
    }
  }

  function configureDankeQueenTrigger(cat) {
    var trigger = document.getElementById("resultTitle");
    if (!trigger) return;
    var enabled = cat && cat.type === "KISS";
    trigger.classList.toggle("is-danke-trigger", enabled);
    trigger.classList.remove("is-trigger-pressing");
    if (enabled) {
      trigger.setAttribute("role", "button");
      trigger.tabIndex = 0;
      trigger.setAttribute("aria-label", "\u70b9\u51fb\u4eb2\u4eb2\u89e6\u53d1\u86cb\u58f3\u5f69\u86cb");
    } else {
      trigger.removeAttribute("role");
      trigger.removeAttribute("tabindex");
      trigger.removeAttribute("aria-label");
    }
  }

  function triggerDankeQueenPop() {
    var pop = document.getElementById("dankeQueenPop");
    if (!pop) return;
    warmDankeQueenImages();
    window.clearTimeout(dankeQueenTimer);
    window.clearTimeout(dankeQueenEntryTimer);
    window.clearTimeout(dankeQueenParticleTimer);
    pop.classList.remove("is-queen-speaking", "is-queen-entering", "is-queen-interacting", "is-queen-bursting");
    void pop.offsetWidth;
    pop.classList.add("is-queen-speaking", "is-queen-entering", "is-queen-bursting");
    document.body.classList.add("is-danke-queen-open");
    playMeowNow(560, 0.24);
    dankeQueenEntryTimer = window.setTimeout(function () {
      pop.classList.remove("is-queen-entering");
    }, 2300);
    dankeQueenParticleTimer = window.setTimeout(function () {
      pop.classList.remove("is-queen-bursting");
    }, 900);
    dankeQueenTimer = window.setTimeout(function () {
      pop.classList.remove("is-queen-speaking", "is-queen-entering", "is-queen-interacting", "is-queen-bursting");
      document.body.classList.remove("is-danke-queen-open");
    }, 5000);
  }

  function playDankeQueenAudio() {
    if (currentDankeQueenAudio) {
      currentDankeQueenAudio.pause();
      currentDankeQueenAudio.currentTime = 0;
    }
    currentDankeQueenAudio = new Audio("audio/danke-interact.mp3");
    currentDankeQueenAudio.volume = 0.78;
    document.body.dataset.dankeQueenAudio = "starting";
    return currentDankeQueenAudio.play().then(function () {
      document.body.dataset.dankeQueenAudio = "playing";
    }).catch(function () {
      document.body.dataset.dankeQueenAudio = "blocked";
    });
  }

  function interactDankeQueenCat(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    var pop = document.getElementById("dankeQueenPop");
    if (!pop || !pop.classList.contains("is-queen-speaking")) return;
    window.clearTimeout(dankeQueenInteractTimer);
    window.clearTimeout(dankeQueenParticleTimer);
    pop.classList.remove("is-queen-interacting", "is-queen-bursting");
    void pop.offsetWidth;
    pop.classList.add("is-queen-interacting", "is-queen-bursting");
    playDankeQueenAudio();
    window.clearTimeout(dankeQueenTimer);
    dankeQueenTimer = window.setTimeout(function () {
      pop.classList.remove("is-queen-speaking", "is-queen-entering", "is-queen-interacting", "is-queen-bursting");
      document.body.classList.remove("is-danke-queen-open");
    }, 4200);
    dankeQueenParticleTimer = window.setTimeout(function () {
      pop.classList.remove("is-queen-bursting");
    }, 900);
    dankeQueenInteractTimer = window.setTimeout(function () {
      pop.classList.remove("is-queen-interacting");
    }, 920);
  }

  function pressDankeQueenTrigger(trigger) {
    if (!trigger || !trigger.classList.contains("is-danke-trigger")) return;
    trigger.classList.add("is-trigger-pressing");
    window.setTimeout(function () {
      trigger.classList.remove("is-trigger-pressing");
    }, 170);
    triggerDankeQueenPop();
  }

  function renderGallery() {
    var groups = [
      { key: "east", title: "东区", note: "东区出没的校园咪", types: ["LOVE-U", "KISS", "GLOW", "IDEA", "RUNNER"] },
      { key: "west", title: "西区", note: "西区出没的校园咪", types: ["HIHI"] },
      { key: "north", title: "北区", note: "北区出没的校园咪", types: ["SALT", "CHIL", "DEVIL", "XXXL", "SONG", "DRINK", "LAMP"] },
      { key: "ranger", title: "游侠", note: "喜欢在校园里到处巡游", types: ["EATR", "BOSS", "IDOL"] }
    ];

    function renderCatCard(cat) {
      var index = config.cats.indexOf(cat);
      var image = getCatImages(cat)[0];
      var imageMarkup = image
        ? '<img data-src="' + image + '" alt="' + cat.name + '" loading="lazy" decoding="async" style="object-fit:contain">'
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
    track.scrollTo({ left: track.clientWidth * nextIndex, behavior: behavior || "smooth" });
    updateDialogPhotoPagination(host, nextIndex);
  }

  function openCatDialog(index) {
    var cat = config.cats[index];
    var images = getCatImages(cat);
    var imageMarkup = images.length
      ? '<div class="dialog-photo-carousel' + (images.length > 1 ? ' has-multiple-photos' : '') + '">' +
          '<div class="dialog-photo-track">' + images.map(function (image, imageIndex) {
            var loadingAttributes = imageIndex === 0 ? ' fetchpriority="high"' : ' loading="lazy"';
            return '<img class="dialog-cover" src="' + image + '" alt="' + cat.name + '的照片 ' + (imageIndex + 1) + '" decoding="async"' + loadingAttributes + '>';
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
      ? '<div class="cat-intro-effect" aria-hidden="true"><img data-src="images/updated-cats/zuoxiajiao-surprise-cutout.png" alt="" decoding="async"></div>'
      : "";
    var biographyMarkup = getStoryBlocks(cat).map(function (block) {
      if (block.image) {
        return '<img class="dialog-story-image" src="' + block.image + '" alt="' + cat.name + '的猫咪小传配图" loading="lazy">';
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

  fillConfiguredContent();
  renderGallery();
  document.body.dataset.view = "home";

  var previewType = new URLSearchParams(window.location.search).get("result");
  var previewAliases = {
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
      var previewFate = getForcedFateOutcome();
      window.setTimeout(function () {
        startFateTransition({
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

  document.getElementById("startButton").addEventListener("click", function () { startTest(true); });
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
  document.getElementById("retryButton").addEventListener("click", function () { startTest(true); });
  document.getElementById("resultTitle").addEventListener("click", function (event) {
    pressDankeQueenTrigger(event.currentTarget);
  });
  document.getElementById("resultTitle").addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!event.currentTarget.classList.contains("is-danke-trigger")) return;
    event.preventDefault();
    pressDankeQueenTrigger(event.currentTarget);
  });
  document.querySelector(".danke-queen-cat").addEventListener("click", interactDankeQueenCat);
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
  document.getElementById("dazuoSurprise").addEventListener("click", function (event) {
    var portrait = document.querySelector(".result-portrait-wrap");
    if (event.target.closest(".gift-box")) {
      startDazuoSurprise(event.currentTarget, portrait);
      return;
    }
    var catButton = event.target.closest("[data-duel-cat]");
    if (catButton) {
      interactWithSurpriseCat(event.currentTarget, catButton.dataset.duelCat);
      return;
    }
    if (event.target.closest("#surpriseEndButton")) {
      endDazuoSurprise(event.currentTarget, portrait);
    }
  });
  document.getElementById("dazuoSurprise").addEventListener("pointerdown", function (event) {
    var catButton = event.target.closest("[data-duel-cat]");
    if (catButton) warmSurpriseCatAudio(catButton.dataset.duelCat);
  }, { passive: true });
  document.getElementById("dazuoSurprise").addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest(".gift-box")) {
      event.preventDefault();
      startDazuoSurprise(event.currentTarget, document.querySelector(".result-portrait-wrap"));
      return;
    }
    var catButton = event.target.closest("[data-duel-cat]");
    if (catButton) {
      event.preventDefault();
      interactWithSurpriseCat(event.currentTarget, catButton.dataset.duelCat);
      return;
    }
    if (event.target.closest("#surpriseEndButton")) {
      event.preventDefault();
      endDazuoSurprise(event.currentTarget, document.querySelector(".result-portrait-wrap"));
    }
  });
  document.getElementById("testBackButton").addEventListener("click", previousQuestion);
  document.getElementById("optionList").addEventListener("click", function (event) {
    var button = event.target.closest("[data-option]");
    if (button) selectAnswer(Number(button.dataset.option));
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
  initDiscPeek();
})();
