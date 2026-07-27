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
  var receiptTimer = null;
  var currentPhotoIndex = 0;
  var currentPhotoCount = 0;
  var currentResultCat = null;
  var galleryReturnView = null;
  var catIntroTimer = null;
  var dialogEffectTimer = null;
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

  function startTest(reset) {
    window.clearTimeout(receiptTimer);
    window.clearTimeout(surpriseDelayTimer);
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

    transitionTimer = window.setTimeout(function () {
      var visibleQuestions = getVisibleQuestions();
      if (currentQuestion < visibleQuestions.length - 1) {
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
    var traits = calculateTraits();
    var specialChoice = getAnswerValue(config.flow.special.question);
    return {
      cat: window.CATBTI_MATCHER.matchCat(config, traits, specialChoice),
      traits: traits
    };
  }

  function getCatImages(cat) {
    if (cat.imagePending) return [];
    return cat.images && cat.images.length ? cat.images : (cat.image ? [cat.image] : []);
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
    track.innerHTML = images.length ? images.map(function (image, index) {
      return '<img src="' + image + '" alt="' + cat.name + '的照片 ' + (index + 1) + '" style="object-fit:contain">';
    }).join("") : '<div class="photo-placeholder" role="img" aria-label="' + cat.name + '的照片待补充"><span>ฅ</span><strong>' + cat.name + '</strong><small>照片待补充</small></div>';
    pagination.innerHTML = images.map(function (_, index) {
      return '<button type="button" data-photo-index="' + index + '" aria-label="查看第 ' + (index + 1) + ' 张照片" aria-current="' + (index === 0) + '"></button>';
    }).join("");
    portrait.classList.toggle("has-single-photo", images.length <= 1);
    portrait.classList.toggle("has-multiple-photos", images.length > 1);
    portrait.classList.toggle("has-pending-photo", images.length === 0);
    track.scrollLeft = 0;
    updatePhotoPagination(0);
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

    currentResultCat = cat;
    window.clearTimeout(catIntroTimer);
    resultType.textContent = cat.type;
    resultType.dataset.length = cat.type.length;
    document.getElementById("resultTitle").textContent = cat.title;
    document.getElementById("resultBarcodeCode").textContent = "CATBTI · " + cat.type;
    renderPhotoCarousel(cat);
    prepareCatIntroEffect(document.querySelector(".result-photo-stage"), cat);
    document.getElementById("resultStamp").textContent = cat.type;
    document.getElementById("resultCatName").textContent = cat.name;
    renderPersonality(cat);
    renderStory(cat);
    document.getElementById("resultQuote").textContent = cat.quote;
    window.clearTimeout(surpriseTimer);
    window.clearTimeout(surpriseDelayTimer);
    portrait.classList.remove("is-dazuo-result", "is-gift-preview", "is-awaiting-surprise", "is-playing-surprise", "is-surprise-complete");
    surprise.classList.remove("is-active");
    surprise.setAttribute("aria-hidden", "true");
    showView("result");
    startReceiptPrint();
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
    var groups = [
      { key: "east", title: "东区", note: "东区出没的校园咪", types: ["LOVE-U", "KISS", "GLOW", "IDEA", "RUNNER"] },
      { key: "west", title: "西区", note: "西区出没的校园咪", types: ["HIHI"] },
      { key: "central", title: "中区", note: "中区出没的校园咪", types: ["DRINK"] },
      { key: "north", title: "北区", note: "北区出没的校园咪", types: ["SALT", "CHIL", "DEVIL", "XXXL", "SONG", "LAMP"] },
      { key: "ranger", title: "游侠", note: "喜欢在校园里到处巡游", types: ["EATR", "BOSS", "IDOL"] }
    ];

    function renderCatCard(cat) {
      var index = config.cats.indexOf(cat);
      var image = getCatImages(cat)[0];
      var imageMarkup = image
        ? '<img src="' + image + '" alt="' + cat.name + '" loading="lazy" style="object-fit:' + (cat.images ? "cover" : (cat.imageFit || "cover")) + '">'
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
  }

  function openCatDialog(index) {
    var cat = config.cats[index];
    var image = getCatImages(cat)[0];
    var imageMarkup = image
      ? '<img class="dialog-cover" src="' + image + '" alt="' + cat.name + '" style="object-fit:contain">'
      : '<span class="dialog-photo-placeholder"><i>ฅ</i><b>' + cat.name + '照片待补充</b></span>';
    var effectName = ["peek", "bounce", "tilt", "float"][index % 4];
    var specialMarkup = cat.introEffect === "big-face"
      ? '<div class="cat-intro-effect" aria-hidden="true"><img src="images/updated-cats/zuoxiajiao-surprise-cutout.png" alt=""></div>'
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
  var previewCat = config.cats.find(function (cat) { return cat.type === previewType; });
  if (previewCat) renderResult(previewCat);
  else if (window.location.hash === "#cats") showView("gallery");

  document.getElementById("startButton").addEventListener("click", function () { startTest(true); });
  document.getElementById("galleryShortcut").addEventListener("click", function () {
    galleryReturnView = null;
    document.getElementById("galleryBackButton").hidden = true;
    showView("gallery");
  });
  document.getElementById("resultGalleryButton").addEventListener("click", function () {
    galleryReturnView = "result";
    document.getElementById("galleryBackButton").hidden = false;
    showView("gallery");
  });
  document.getElementById("galleryBackButton").addEventListener("click", function () {
    if (!galleryReturnView) return;
    showView(galleryReturnView);
  });
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
