(function (global) {
  "use strict";

  var TRAIT_KEYS = ["attitude", "action", "area", "pursuit"];
  var FALLBACK_KEYS = ["attitude", "action", "pursuit"];

  function getMajority(values, firstValue, secondValue) {
    if (!Array.isArray(values) || values.length !== 3 || values.some(function (value) { return value == null; })) {
      return null;
    }

    var firstVotes = values.filter(function (value) { return value === firstValue; }).length;
    var secondVotes = values.filter(function (value) { return value === secondValue; }).length;
    if (firstVotes >= 2) return firstValue;
    if (secondVotes >= 2) return secondValue;
    return null;
  }

  function traitsMatch(left, right) {
    return TRAIT_KEYS.every(function (key) {
      return left[key] && left[key] === right[key];
    });
  }

  function matchCat(config, traits, specialChoice) {
    if (traitsMatch(traits, config.flow.special.traits) && specialChoice) {
      return config.cats.find(function (cat) {
        return cat.type === specialChoice && cat.specialChoice === specialChoice;
      });
    }

    var exact = config.cats.find(function (cat) {
      return !cat.specialChoice && traitsMatch(traits, cat.traits);
    });
    if (exact) return exact;

    // Region is a hard boundary. A closest-match fallback must never move a
    // student to a cat from another selected campus area.
    var candidates = config.cats.filter(function (cat) {
      return !cat.specialChoice && cat.traits.area === traits.area;
    });
    if (!candidates.length) return null;

    return candidates.map(function (cat, index) {
      var score = FALLBACK_KEYS.reduce(function (total, key) {
        return total + (cat.traits[key] === traits[key] ? 1 : 0);
      }, 0);
      return { cat: cat, score: score, index: index };
    }).sort(function (left, right) {
      return right.score - left.score || left.index - right.index;
    })[0].cat;
  }

  global.CATBTI_MATCHER = {
    getMajority: getMajority,
    matchCat: matchCat,
    traitsMatch: traitsMatch
  };
})(window);
