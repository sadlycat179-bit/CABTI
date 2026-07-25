(function () {
  "use strict";

  var config = window.CATBTI_CONFIG;
  var views = Array.from(document.querySelectorAll(".view"));
  var currentQuestion = 0;
  var answers = new Array(config.questions.length).fill(null);
  var transitionTimer = null;
  var audioContext = null;
  var surpriseTimer = null;
  var surpriseDelayTimer = null;
  var receiptTimer = null;
  var currentPhotoIndex = 0;
  var currentPhotoCount = 0;
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
    window.scrollTo(0, 0);
    document.getElementById("app").focus({ preventScroll: true });
  }

  function renderFacts() {
    document.getElementById("quickFacts").innerHTML = config.site.facts.map(function (fact) {
      return '<span><i aria-hidden="true"></i>' + fact + "</span>";
    }).join("");
  }

  function startTest(reset) {
    window.clearTimeout(receiptTimer);
    window.clearTimeout(surpriseDelayTimer);
    if (reset) answers.fill(null);
    currentQuestion = 0;
    showView("test");
    renderQuestion();
  }

  function renderQuestion() {
    var question = config.questions[currentQuestion];
    var total = config.questions.length;
    var percent = Math.round(((currentQuestion + 1) / total) * 100);
    var panel = document.getElementById("questionPanel");

    document.getElementById("progressLabel").textContent = "进度 " + (currentQuestion + 1) + " / " + total;
    document.getElementById("progressPercent").textContent = percent + "%";
    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("questionNumber").textContent = "QUESTION " + String(currentQuestion + 1).padStart(2, "0");
    document.getElementById("questionTitle").textContent = question.text;
    document.getElementById("questionHint").textContent = question.hint || "";
    document.getElementById("testBackButton").disabled = currentQuestion === 0;

    document.getElementById("optionList").innerHTML = question.options.map(function (option, index) {
      var selected = answers[currentQuestion] === index;
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
    answers[currentQuestion] = index;
    document.querySelectorAll(".option-button").forEach(function (button, buttonIndex) {
      var selected = buttonIndex === index;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-checked", String(selected));
    });

    transitionTimer = window.setTimeout(function () {
      if (currentQuestion < config.questions.length - 1) {
        currentQuestion += 1;
        renderQuestion();
      } else {
        renderResult(calculateResult());
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
    var totals = {};
    Object.keys(config.dimensions).forEach(function (dimension) { totals[dimension] = 0; });

    answers.forEach(function (answerIndex, questionIndex) {
      var option = config.questions[questionIndex].options[answerIndex];
      if (!option) return;
      Object.keys(option.score).forEach(function (dimension) {
        totals[dimension] += option.score[dimension];
      });
    });

    var dimensionKey = Object.keys(config.dimensions).map(function (dimension) {
      return totals[dimension] >= 0 ? config.dimensions[dimension].positive : config.dimensions[dimension].negative;
    }).join("");
    var type = config.resultMap[dimensionKey];
    return config.cats.find(function (cat) { return cat.type === type; }) || config.cats[0];
  }

  function getCatImages(cat) {
    return cat.images && cat.images.length ? cat.images : [cat.image];
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
    track.scrollTo({ left: track.clientWidth * nextIndex, behavior: behavior || "smooth" });
    updatePhotoPagination(nextIndex);
  }

  function renderPhotoCarousel(cat) {
    var images = getCatImages(cat);
    var track = document.getElementById("resultPhotoTrack");
    var pagination = document.getElementById("photoPagination");
    var portrait = document.querySelector(".result-portrait-wrap");
    currentPhotoCount = images.length;
    currentPhotoIndex = 0;
    track.innerHTML = images.map(function (image, index) {
      var fit = index === 0 && cat.images ? "cover" : (cat.imageFit || "cover");
      return '<img src="' + image + '" alt="' + cat.name + '的照片 ' + (index + 1) + '" style="object-fit:' + fit + '">';
    }).join("");
    pagination.innerHTML = images.map(function (_, index) {
      return '<button type="button" data-photo-index="' + index + '" aria-label="查看第 ' + (index + 1) + ' 张照片" aria-current="' + (index === 0) + '"></button>';
    }).join("");
    portrait.classList.toggle("has-single-photo", images.length === 1);
    track.scrollLeft = 0;
    updatePhotoPagination(0);
  }

  function completeReceiptPrint(scene, resultView) {
    scene.classList.add("is-printed");
    resultView.classList.add("is-receipt-ready");
  }

  function startReceiptPrint() {
    var scene = document.getElementById("receiptScene");
    var feed = document.getElementById("receiptFeed");
    var receipt = document.getElementById("resultReceipt");
    var resultView = document.getElementById("resultView");
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.clearTimeout(receiptTimer);
    scene.classList.remove("is-printing", "is-printed");
    resultView.classList.remove("is-receipt-ready");
    feed.style.setProperty("--receipt-height", (receipt.scrollHeight + 32) + "px");

    if (reducedMotion) {
      completeReceiptPrint(scene, resultView);
      return;
    }

    void scene.offsetWidth;
    scene.classList.add("is-printing");
    receiptTimer = window.setTimeout(function () {
      completeReceiptPrint(scene, resultView);
    }, receiptPrintDuration);
  }

  function renderResult(cat) {
    var resultType = document.getElementById("resultType");
    var surprise = document.getElementById("dazuoSurprise");
    var portrait = document.querySelector(".result-portrait-wrap");

    resultType.textContent = cat.type;
    resultType.dataset.length = cat.type.length;
    document.getElementById("resultTitle").textContent = cat.title;
    renderPhotoCarousel(cat);
    document.getElementById("resultStamp").textContent = cat.type;
    document.getElementById("resultCatName").textContent = cat.name;
    document.getElementById("resultMbti").textContent = "MBTI 参考型 · " + cat.mbti;
    document.getElementById("resultBiography").textContent = cat.biography;
    document.getElementById("resultPersonality").textContent = cat.personality;
    document.getElementById("resultKeywords").innerHTML = cat.keywords.map(function (word) { return "<span>" + word + "</span>"; }).join("");
    document.getElementById("resultQuote").textContent = cat.quote;
    document.getElementById("receiptNumber").textContent = "CAT-" + String(config.cats.indexOf(cat) + 1).padStart(3, "0");
    document.getElementById("receiptCode").textContent = "CATBTI-" + cat.type + "-" + cat.mbti;
    window.clearTimeout(surpriseTimer);
    window.clearTimeout(surpriseDelayTimer);
    portrait.classList.remove("is-dazuo-result", "is-gift-preview", "is-awaiting-surprise", "is-playing-surprise", "is-surprise-complete");
    surprise.classList.remove("is-active");
    surprise.setAttribute("aria-hidden", "true");
    if (cat.type === "GENT") portrait.classList.add("is-dazuo-result", "is-gift-preview");
    showView("result");
    startReceiptPrint();
    if (cat.type === "GENT") {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        prepareDazuoSurprise(surprise, portrait);
      } else {
        surpriseDelayTimer = window.setTimeout(function () {
          prepareDazuoSurprise(surprise, portrait);
        }, receiptPrintDuration + 220);
      }
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

  function completeDazuoSurprise(surprise, portrait) {
    portrait.classList.remove("is-awaiting-surprise", "is-playing-surprise");
    portrait.classList.add("is-surprise-complete");
    surprise.classList.remove("is-active");
    surprise.setAttribute("aria-hidden", "true");
  }

  function startDazuoSurprise(surprise, portrait) {
    if (!surprise || !portrait || portrait.classList.contains("is-playing-surprise")) return;
    window.clearTimeout(surpriseTimer);
    portrait.classList.remove("is-awaiting-surprise", "is-surprise-complete");
    portrait.classList.add("is-playing-surprise");
    surprise.classList.remove("is-active");
    void surprise.offsetWidth;
    surprise.classList.add("is-active");
    surprise.setAttribute("aria-hidden", "true");
    playDazuoSound();
    surpriseTimer = window.setTimeout(function () {
      completeDazuoSurprise(surprise, portrait);
    }, 4450);
  }

  function prepareDazuoSurprise(surprise, portrait) {
    if (!surprise || !portrait) return;
    portrait.classList.remove("is-gift-preview");
    portrait.classList.add("is-dazuo-result");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      completeDazuoSurprise(surprise, portrait);
      return;
    }

    portrait.classList.add("is-awaiting-surprise");
    surprise.setAttribute("aria-hidden", "false");
  }

  function renderGallery() {
    document.getElementById("catGrid").innerHTML = config.cats.map(function (cat, index) {
      var image = getCatImages(cat)[0];
      return '<button class="cat-card" type="button" data-cat-index="' + index + '" aria-label="查看' + cat.name + '的资料">' +
        '<span class="card-image"><img src="' + image + '" alt="' + cat.name + '" loading="lazy" style="object-fit:' + (cat.images ? "cover" : (cat.imageFit || "cover")) + '"><i>' + cat.type + "</i></span>" +
        '<span class="card-copy"><small>' + cat.mbti + " · " + cat.title + "</small><strong>" + cat.name + '<span class="card-arrow" aria-hidden="true">↗</span></strong></span>' +
        "</button>";
    }).join("");
  }

  function openCatDialog(index) {
    var cat = config.cats[index];
    var image = getCatImages(cat)[0];
    document.getElementById("dialogContent").innerHTML =
      '<div class="dialog-image"><img src="' + image + '" alt="' + cat.name + '" style="object-fit:' + (cat.images ? "cover" : (cat.imageFit || "cover")) + '"><span>' + cat.type + "</span></div>" +
      '<div class="dialog-copy"><small>' + cat.mbti + " · " + cat.title + "</small><h3>" + cat.name + "</h3>" +
      '<section><h4>猫咪小传</h4><p>' + cat.biography + "</p></section>" +
      '<section><h4>你可能是</h4><p>' + cat.personality + "</p></section>" +
      '<div class="keyword-list">' + cat.keywords.map(function (word) { return "<span>" + word + "</span>"; }).join("") + "</div></div>";
    document.getElementById("catDialog").showModal();
  }

  function closeDialog() {
    document.getElementById("catDialog").close();
  }

  fillConfiguredContent();
  renderFacts();
  renderGallery();
  document.body.dataset.view = "home";

  var previewType = new URLSearchParams(window.location.search).get("result");
  var previewCat = config.cats.find(function (cat) { return cat.type === previewType; });
  if (previewCat) renderResult(previewCat);

  document.getElementById("startButton").addEventListener("click", function () { startTest(true); });
  document.getElementById("showCatsButton").addEventListener("click", function () { showView("gallery"); });
  document.getElementById("galleryShortcut").addEventListener("click", function () { showView("gallery"); });
  document.getElementById("resultGalleryButton").addEventListener("click", function () { showView("gallery"); });
  document.getElementById("retryButton").addEventListener("click", function () { startTest(true); });
  document.getElementById("photoPrev").addEventListener("click", function () { showPhoto(currentPhotoIndex - 1); });
  document.getElementById("photoNext").addEventListener("click", function () { showPhoto(currentPhotoIndex + 1); });
  document.getElementById("photoPagination").addEventListener("click", function (event) {
    var button = event.target.closest("[data-photo-index]");
    if (button) showPhoto(Number(button.dataset.photoIndex));
  });
  document.getElementById("resultPhotoTrack").addEventListener("scroll", function (event) {
    var track = event.currentTarget;
    if (track.clientWidth) updatePhotoPagination(Math.round(track.scrollLeft / track.clientWidth));
  }, { passive: true });
  document.getElementById("dazuoSurpriseStart").addEventListener("click", function () {
    startDazuoSurprise(document.getElementById("dazuoSurprise"), document.querySelector(".result-portrait-wrap"));
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
})();
