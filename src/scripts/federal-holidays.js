const { directMention } = require("@slack/bolt");
const moment = require("moment");
const {
  dates: { getNextHoliday },
  holidays: { emojis },
  homepage: { registerDidYouKnow },
  stats: { incrementStats },
} = require("../utils");

const getHolidayText = () => {
  const holiday = getNextHoliday();
  const nextOne = moment(holiday.date);
  const daysUntil = Math.ceil(
    moment.duration(nextOne.utc().format("x") - Date.now()).asDays()
  );

  const emoji = emojis.get(holiday.name);

  return `The next federal holiday is ${
    holiday.alsoObservedAs ?? holiday.name
  } ${emoji || ""}${emoji ? " " : ""}in ${daysUntil} days on ${nextOne
    .utc()
    .format("dddd, MMMM Do")}`;
};

module.exports = (app) => {
  registerDidYouKnow(() => ({
    type: "section",
    text: {
      type: "mrkdwn",
      text: getHolidayText(),
    },
  }));

  app.message(
    directMention(),
    /(when is( the)? )?next (federal )?holiday/i,
    ({ say }) => {
      say(getHolidayText());
      incrementStats("next federal holiday request");
    }
  );
};
