const fs = require("fs");
const vm = require("vm");

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync("config.js", "utf8"), context);
vm.runInContext(fs.readFileSync("matcher.js", "utf8"), context);

const config = context.window.CATBTI_CONFIG;
const matcher = context.window.CATBTI_MATCHER;
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function verifyMajority(firstValue, secondValue, label) {
  for (let mask = 0; mask < 8; mask += 1) {
    const values = [0, 1, 2].map((bit) => (mask & (1 << bit) ? secondValue : firstValue));
    const secondVotes = values.filter((value) => value === secondValue).length;
    const expected = secondVotes >= 2 ? secondValue : firstValue;
    const actual = matcher.getMajority(values, firstValue, secondValue);
    assert(actual === expected, `${label} majority ${values.join("/")} should be ${expected}, got ${actual}`);
  }
}

verifyMajority("friendly", "cautious", "attitude");
verifyMajority("active", "observer", "action");
assert(matcher.getMajority(["friendly", "friendly", null], "friendly", "cautious") === null, "incomplete majority should be null");

const expectedCats = {
  "LOVE-U": ["蛋挞", "friendly", "observer", "east", "guard"],
  HIHI: ["大夹子", "friendly", "active", "west", "adored"],
  SALT: ["薄荷", "friendly", "observer", "north", "freedom"],
  CHIL: ["笑笑", "friendly", "observer", "north", "life"],
  EATR: ["乌云", "friendly", "observer", "roam", "food"],
  DEVIL: ["四喜", "cautious", "observer", "north", "freedom"],
  XXXL: ["三宝", "friendly", "active", "north", "food"],
  BOSS: ["大逼斗", "cautious", "observer", "roam", "adored"],
  SONG: ["黛玉", "cautious", "observer", "north", "guard"],
  KISS: ["左下角", "friendly", "active", "east", "adored"],
  GLOW: ["青桔", "friendly", "active", "east", "adored"],
  IDEA: ["蛋黄", "friendly", "active", "east", "adored"],
  IDOL: ["饭包", "friendly", "observer", "roam", "freedom"],
  DRINK: ["养乐多", "friendly", "active", "north", "adored"],
  LAMP: ["桔子灯", "friendly", "active", "north", "guard"],
  RUNNER: ["蛋饼", "cautious", "observer", "east", "freedom"],
};

Object.entries(expectedCats).forEach(([type, expected]) => {
  const cat = config.cats.find((item) => item.type === type);
  assert(Boolean(cat), `${type} is missing`);
  if (!cat) return;
  const [name, attitude, action, area, pursuit] = expected;
  assert(cat.name === name, `${type} name should be ${name}, got ${cat.name}`);
  assert(cat.traits.attitude === attitude, `${type} attitude mismatch`);
  assert(cat.traits.action === action, `${type} action mismatch`);
  assert(cat.traits.area === area, `${type} area mismatch`);
  assert(cat.traits.pursuit === pursuit, `${type} pursuit mismatch`);

  const result = matcher.matchCat(config, cat.traits, cat.specialChoice || null);
  assert(result && result.type === type, `${type} exact path returned ${result && result.type}`);
});

const expectedOptions = {
  "attitude-1": ["friendly", "cautious"],
  "attitude-2": ["cautious", "friendly"],
  "attitude-3": ["friendly", "cautious"],
  "action-1": ["observer", "active"],
  "action-2": ["active", "observer"],
  "action-3": ["observer", "active"],
  area: ["east", "west", "north", "roam"],
  aspiration: ["social", "autonomy", "food"],
  "pursuit-social": ["guard", "adored"],
  "pursuit-autonomy": ["life", "freedom"],
  "east-adored-life": ["KISS", "IDEA", "GLOW"],
};

Object.entries(expectedOptions).forEach(([id, expected]) => {
  const question = config.questions.find((item) => item.id === id);
  const actual = question && question.options.map((option) => option.value);
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${id} options: ${JSON.stringify(actual)}`);
});

const eastFood = matcher.matchCat(config, {
  attitude: "friendly",
  action: "active",
  area: "east",
  pursuit: "food",
}, null);
assert(eastFood && eastFood.traits.area === "east", "east fallback crossed into another area");
assert(eastFood && eastFood.type !== "XXXL", "east fallback incorrectly returned 三宝");

const values = {
  attitude: ["friendly", "cautious"],
  action: ["active", "observer"],
  area: ["east", "west", "north", "roam"],
  pursuit: ["guard", "adored", "freedom", "life", "food"],
};

values.attitude.forEach((attitude) => {
  values.action.forEach((action) => {
    values.area.forEach((area) => {
      values.pursuit.forEach((pursuit) => {
        const result = matcher.matchCat(config, { attitude, action, area, pursuit }, null);
        assert(Boolean(result), `no fallback for ${attitude}/${action}/${area}/${pursuit}`);
        assert(result && result.traits.area === area, `fallback crossed ${area} -> ${result && result.traits.area}`);
      });
    });
  });
});

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Both three-question dimensions passed all 16 majority combinations; 16 exact cat paths passed; 80 fallback combinations stayed in their selected area.");
