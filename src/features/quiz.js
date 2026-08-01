(function () {
  "use strict";

  window.CATBTI_FEATURES = window.CATBTI_FEATURES || {};

  window.CATBTI_FEATURES.createQuizController = function (options) {
    var config = options.config;
    var matcher = options.matcher;
    var runWhenIdle = options.runWhenIdle;
    var currentQuestion = 0;
    var answers = {};
    var transitionTimer = null;

    function getFateController() {
      return options.getFateController();
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
      return matcher.getMajority(ids.map(getAnswerValue), firstValue, secondValue);
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
      if (traitsMatch(calculateTraits(), config.flow.special.traits)) ids.push(config.flow.special.question);
      return ids.map(getQuestionById);
    }

    function render() {
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
        runWhenIdle(getFateController().warm, 480);
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

    function calculateResult() {
      var traits = calculateTraits();
      var specialChoice = getAnswerValue(config.flow.special.question);
      var forcedFate = getFateController().getForcedOutcome();
      return {
        cat: matcher.matchCat(config, traits, specialChoice),
        traits: traits,
        secretSurprise: forcedFate === null ? Math.random() < options.surpriseChance : forcedFate
      };
    }

    function start(reset) {
      options.resetResultTimers();
      getFateController().reset();
      if (reset) answers = {};
      currentQuestion = 0;
      options.showView("test");
      render();
    }

    function select(index) {
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
        getFateController().start(calculateResult());
        return;
      }
      transitionTimer = window.setTimeout(function () {
        if (currentQuestion < getVisibleQuestions().length - 1) {
          currentQuestion += 1;
          render();
        }
      }, 360);
    }

    function previous() {
      window.clearTimeout(transitionTimer);
      if (currentQuestion === 0) return;
      currentQuestion -= 1;
      render();
    }

    return {
      start: start,
      select: select,
      previous: previous
    };
  };
}());
