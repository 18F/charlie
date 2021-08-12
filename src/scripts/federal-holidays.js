const { directMention } = require("@slack/bolt");
const {
  dates: { getNextHoliday, getToday },
  holidays: { emojis },
} = require("../utils");

// The PluralRules API is not implemented in the polyfill, so revert to the
// global instance.
const pr = new Intl.PluralRules("en-US", { type: "ordinal" });
const suffixes = new Map([
  ["one", "st"],
  ["two", "nd"],
  ["few", "rd"],
  ["other", "th"],
]);
const getOrdinal = (n) => {
  const rule = pr.select(n);
  return suffixes.get(rule);
};
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

module.exports = (app) => {
  app.message(
    directMention(),
    /(when is( the)? )?next (federal )?holiday/i,
    ({ say }) => {
      const holiday = getNextHoliday();
      const today = getToday();

      const { days: daysUntil } = today.until(holiday.date);

      const emoji = emojis.get(holiday.name);

      say(
        `The next federal holiday is ${holiday.name} ${emoji || ""}${
          emoji ? " " : ""
        }in ${daysUntil} days on ${dateFormatter.format(
          holiday.date
        )}${getOrdinal(holiday.date.day)}`
      );
    }
  );
};
