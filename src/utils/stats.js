const brain = require("../brain");

const BRAIN_KEY = "charlie-usage-stats";

const incrementStats = (script) => {
  const stats = brain.get(BRAIN_KEY) ?? {};
  stats[script] = (stats[script] ?? 0) + 1;
  brain.set(BRAIN_KEY, stats);
};

module.exports = { incrementStats, BRAIN_KEY };
