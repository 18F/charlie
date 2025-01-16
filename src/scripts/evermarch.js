/* This is a joke bot, in reference to how time never seems to pass since March
   2020. This is one of our coping mechanisms during the COVID-19 pandemic.
   Future maintainers, please be gentle with us. We're doing the best we can
   with what we've got.
*/

const moment = require("moment-timezone");

const march1 = moment.tz("2020-03-01T00:00:00", "America/New_York");

module.exports = (robot) => {
  robot.message(/evermarch/i, ({ message, say }) => {
    const now = moment.tz("America/New_York");

    const days = now.diff(march1, "days") + 1;

    say({
      icon_emoji: ":calendar-this-is-fine:",
      text: `Today is March ${days}, 2020, in the Evermarch reckoning.`,
      thread_ts: message.thread_ts,
    });
  });
};
