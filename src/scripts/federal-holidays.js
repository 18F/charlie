const { directMention } = require("@slack/bolt");
const moment = require("moment");
const {
  dates: { getNextHoliday },
  holidays: { emojis },
} = require("../utils");

module.exports = (app) => {
  app.message(
    directMention(),
    /(when is( the)? )?next (federal )?holiday/i,
    ({ say }) => {
      const holiday = getNextHoliday();
      const nextOne = moment(holiday.date);
      const daysUntil = Math.ceil(
        moment.duration(nextOne.utc().format("x") - Date.now()).asDays()
      );

      const emoji = emojis.get(holiday.name);

      say(
        `The next federal holiday is ${holiday.name} ${emoji || ""}${
          emoji ? " " : ""
        }in ${daysUntil} days on ${nextOne.utc().format("dddd, MMMM Do")}`
      );
    }
  );
};
