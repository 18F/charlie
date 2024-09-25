const { cache } = require("./cache");
const dates = require("./dates");
const helpMessage = require("./helpMessage");
const holidays = require("./holidays");
const homepage = require("./homepage");
const optOut = require("./optOut");
const slack = require("./slack");
const stats = require("./stats");
const tock = require("./tock");
const sample = require("./sample");

module.exports = {
  cache,
  dates,
  helpMessage,
  holidays,
  homepage,
  optOut,
  sample,
  slack,
  stats,
  tock,
};
