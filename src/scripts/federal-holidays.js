const { directMention } = require("@slack/bolt");
const moment = require("moment");
const {
  dates: { getNextHoliday },
  helpMessage,
  holidays: { emojis },
  homepage: { registerDidYouKnow },
  stats: { incrementStats },
} = require("../utils");

const getHolidayText = () => {
  const holiday = getNextHoliday();
  const nextOne = moment(holiday.date);
  const daysUntil = Math.ceil(
    moment.duration(nextOne.utc().format("x") - Date.now()).asDays(),
  );

  const emoji = emojis.get(holiday.alsoObservedAs ?? holiday.name);

  return `The next federal holiday is ${
    holiday.alsoObservedAs ?? holiday.name
  } ${emoji || ""}${emoji ? " " : ""}in ${daysUntil} days on ${nextOne
    .utc()
    .format("dddd, MMMM Do")}`;
};

module.exports = (app) => {
  helpMessage.registerInteractive(
    "Federal holidays",
    "next holiday",
    "Itching for a day off and want to know when the next holiday is? Charlie knows all the (standard, recurring) federal holidays and will gladly tell you what's coming up next!",
    true,
  );

  registerDidYouKnow(() => ({
    type: "section",
    text: {
      type: "mrkdwn",
      text: getHolidayText(),
    },
  }));

  app.message(
    directMention,
    /next (federal )?holiday/i,
    ({ event: { thread_ts: thread }, say }) => {
      say({ text: getHolidayText(), thread_ts: thread });
      incrementStats("next federal holiday request");
    },
  );
};
