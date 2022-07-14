const { directMention } = require("@slack/bolt");
const moment = require("moment");
const {
  stats: { incrementStats },
} = require("../utils");

// We need a known pay date to work from.
const REFERENCE_DATE = moment.utc("2022-01-07");

const firstFridayOfMonth = (date) => {
  const friday = moment.utc(date).hour(0).minute(0).second(0).date(1);
  while (friday.day() !== 5) {
    friday.add(1, "day");
  }
  return friday;
};

const isPayDate = (date) => {
  const weeks = moment.duration(date.diff(REFERENCE_DATE)).as("weeks");
  if (Math.round(weeks) % 2 === 0) {
    return true;
  }
  return false;
};

const isThreePaycheckMonth = (date) => {
  const payday = firstFridayOfMonth(date);
  if (isPayDate(payday)) {
    const second = moment.utc(payday).add(14, "days");
    const third = moment.utc(payday).add(28, "days");
    if (second.month() === payday.month() && third.month() === payday.month()) {
      return true;
    }
  }
  return false;
};

const getNextThreePaycheckMonth = (from = Date.now()) => {
  // Get the first day of the month
  const date = moment.utc(from).hour(0).minute(0).second(0);

  while (!isThreePaycheckMonth(date)) {
    date.add(1, "month");
  }

  return date.date(1);
};

module.exports = (app) => {
  app.message(
    directMention(),
    // Be very permissive in what we listen for.e
    // https://regexper.com/#%2F.*%28three%7C3%29%5Cb.*pay%5B-%5Cs%5D%3F%28check%7Cday%29.*%2F
    /.*(three|3)\b.*pay[-\s]?(check|day).*/i,
    ({ message: { thread_ts: thread }, say }) => {
      incrementStats("3 paycheck month");
      const next = getNextThreePaycheckMonth();

      say({
        text: `The next 3-paycheck month is ${next.format("MMMM yyyy")}.`,
        thread_ts: thread,
      });
    }
  );
};
