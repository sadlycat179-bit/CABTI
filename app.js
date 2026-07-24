(function () {
  "use strict";

  var config = window.CATBTI_CONFIG;
  var views = Array.from(document.querySelectorAll(".view"));
  var currentQuestion = 0;
  var answers = new Array(config.questions.length).fill(null);
  var transitionTimer = null;

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
    window.scrollTo(0, 0);
    document.getElementById("app").focus({ preventScroll: true });
  }

  function renderFacts() {
    document.getElementById("quickFacts").innerHTML = config.site.facts.map(function (fact) {
      return '<span><i aria-hidden="true"></i>' + fact + "</span>";
    }).join("");
  }

  function startTest(reset) {
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
    document.getElementById("testBackButton").classList.toggle("is-home", currentQuestion === 0);

    document.getElementById("optionList").innerHTML = question.options.map(function (option, index) {
      var selected = answers[currentQuestion] === index;
      return '<button class="option-button' + (selected ? " is-selected" : "") + '" type="button" role="radio" aria-checked="' + selected + '" data-option="' + index + '">' +
        '<span class="option-icon" aria-hidden="true">' + option.icon + "</span>" +
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
    if (currentQuestion === 0) {
      showView("home");
      return;
    }
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

  function renderResult(cat) {
    document.getElementById("resultType").textContent = cat.type;
    document.getElementById("resultTitle").textContent = cat.title;
    document.getElementById("resultImage").src = cat.image;
    document.getElementById("resultImage").alt = cat.name + "，" + cat.title;
    document.getElementById("resultStamp").textContent = cat.type;
    document.getElementById("resultCatName").textContent = cat.name;
    document.getElementById("resultDescription").textContent = cat.introduction;
    document.getElementById("resultKeywords").innerHTML = cat.keywords.map(function (word) { return "<span>" + word + "</span>"; }).join("");
    document.getElementById("resultQuote").textContent = cat.quote;
    showView("result");
  }

  function renderGallery() {
    document.getElementById("catGrid").innerHTML = config.cats.map(function (cat, index) {
      return '<button class="cat-card" type="button" data-cat-index="' + index + '" aria-label="查看' + cat.name + '的资料">' +
        '<span class="card-image"><img src="' + cat.image + '" alt="' + cat.name + '" loading="lazy"><i>' + cat.type + "</i></span>" +
        '<span class="card-copy"><small>' + cat.title + "</small><strong>" + cat.name + '</strong><span class="card-arrow" aria-hidden="true">↗</span></span>' +
        "</button>";
    }).join("");
  }

  function openCatDialog(index) {
    var cat = config.cats[index];
    document.getElementById("dialogContent").innerHTML =
      '<div class="dialog-image"><img src="' + cat.image + '" alt="' + cat.name + '"><span>' + cat.type + "</span></div>" +
      '<div class="dialog-copy"><small>' + cat.type + " · " + cat.title + "</small><h3>" + cat.name + "</h3><p>" + cat.introduction + "</p>" +
      '<div class="keyword-list">' + cat.keywords.map(function (word) { return "<span>" + word + "</span>"; }).join("") + "</div></div>";
    document.getElementById("catDialog").showModal();
  }

  function closeDialog() {
    document.getElementById("catDialog").close();
  }

  fillConfiguredContent();
  renderFacts();
  renderGallery();

  document.getElementById("startButton").addEventListener("click", function () { startTest(true); });
  document.getElementById("showCatsButton").addEventListener("click", function () { showView("gallery"); });
  document.getElementById("galleryShortcut").addEventListener("click", function () { showView("gallery"); });
  document.getElementById("resultGalleryButton").addEventListener("click", function () { showView("gallery"); });
  document.getElementById("retryButton").addEventListener("click", function () { startTest(true); });
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
