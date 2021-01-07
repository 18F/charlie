const fedHolidays = require("@18f/us-federal-holidays");
const moment = require("moment");

module.exports = (robot) => {
  robot.message(/(when is( the)? )?next holiday/i, ({ say }) => {
    const now = new Date();
    const holidays = fedHolidays.allForYear(now.getFullYear());
    let i = 0;

    while (i < holidays.length) {
      if (holidays[i].date >= now) {
        const nextOne = moment(holidays[i].date);
        const daysUntil = Math.ceil(
          moment.duration(nextOne.utc().format("x") - Date.now()).asDays()
        );
        say(
          `The next federal holiday is ${
            holidays[i].name
          } in ${daysUntil} days on ${nextOne.utc().format("dddd, MMMM Do")}`
        );
        break;
      }
      i += 1;
    }
  });
};
