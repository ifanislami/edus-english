const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "src", "App.jsx"), "utf8");
const csv = fs
  .readFileSync(path.join(root, "data", "b2_news_lexicon_draft.csv"), "utf8")
  .trim()
  .split(/\r?\n/);

const parseJsonConstant = (name) => {
  const match = app.match(new RegExp(`const ${name} = (\\[[^;]+\\]);`, "s"));
  if (!match) throw new Error(`Cannot find ${name}`);
  return JSON.parse(match[1]);
};

const common = parseJsonConstant("DB_EN");
const awl = parseJsonConstant("DB_AWL");
const cognateBlock = app.match(
  /const AWL_DIRECT_COGNATES = new Set\(\[([\s\S]*?)\]\);/
);
if (!cognateBlock) throw new Error("Cannot find AWL_DIRECT_COGNATES");
const excludedCognates = new Set(
  [...cognateBlock[1].matchAll(/"([^"]+)"/g)].map((match) => match[1])
);
const filteredAwl = awl.filter(({ en }) => !excludedCognates.has(en));

const rows = csv.slice(1).map((line) => {
  const [expression, translation, unitType, domain] = line.split(",");
  return { expression, translation, unitType, domain };
});
const commonSet = new Set(common.map(({ word }) => word.toLowerCase()));
const awlSet = new Set(filteredAwl.map(({ en }) => en.toLowerCase()));

// Conservative editorial check only: it catches obvious derivational overlap.
// It is intentionally reported separately because English word families cannot
// be identified reliably with suffix stripping alone.
const familyStem = (word) => {
  const rules = [
    [/abilities$/, "able"],
    [/ability$/, "able"],
    [/ibilities$/, "ible"],
    [/ibility$/, "ible"],
    [/ations?$/, "ate"],
    [/ifications?$/, "ify"],
    [/isations?$/, "ise"],
    [/izations?$/, "ize"],
    [/(?:tions?|sions?)$/, ""],
    [/ments?$/, ""],
    [/ness$/, ""],
    [/ities$/, ""],
    [/ity$/, ""],
    [/ances?$/, ""],
    [/ences?$/, ""],
  ];
  let stem = word.toLowerCase();
  for (const [pattern, replacement] of rules) {
    if (pattern.test(stem) && stem.replace(pattern, replacement).length >= 5) {
      return stem.replace(pattern, replacement);
    }
  }
  return stem;
};
const baselineFamilies = new Map();
for (const value of [...commonSet, ...awlSet]) {
  const stem = familyStem(value);
  if (!baselineFamilies.has(stem)) baselineFamilies.set(stem, []);
  baselineFamilies.get(stem).push(value);
}

const exactOverlaps = rows
  .filter(({ expression }) => {
    const value = expression.toLowerCase();
    return commonSet.has(value) || awlSet.has(value);
  })
  .map(({ expression }) => expression);

const seen = new Set();
const internalDuplicates = [];
for (const { expression } of rows) {
  const value = expression.toLowerCase();
  if (seen.has(value)) internalDuplicates.push(expression);
  seen.add(value);
}

const possibleFamilyOverlaps = rows
  .filter(({ unitType }) => unitType === "single_word")
  .flatMap(({ expression }) => {
    const baseline = baselineFamilies.get(familyStem(expression));
    return baseline ? [{ expression, baseline }] : [];
  });

const summary = {
  units: rows.length,
  singleWords: rows.filter(({ unitType }) => unitType === "single_word").length,
  multiwordUnits: rows.filter(({ unitType }) => unitType !== "single_word").length,
  commonBaseline: common.length,
  filteredAwlBaseline: filteredAwl.length,
  exactOverlaps,
  possibleFamilyOverlaps,
  internalDuplicates,
};

console.log(JSON.stringify(summary, null, 2));
if (exactOverlaps.length || internalDuplicates.length) process.exitCode = 1;
