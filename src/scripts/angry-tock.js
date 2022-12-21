const holidays = require("@18f/us-federal-holidays");
const moment = require("moment-timezone");
const scheduler = require("node-schedule");
const {
  dates: { getCurrentWorkWeek },
  slack: { sendDirectMessage },
  tock: { get18FTockSlackUsers, get18FTockTruants },
  helpMessage,
} = require("../utils");

module.exports = (app, config = process.env) => {
  helpMessage.registerNonInteractive(
    "Angry Tock",
    "On the first morning of the work week, Angry Tock will disappointedly remind Tock-able users who haven't Tocked yet. At the end of the day, it'll also let supervisors know about folks who are still truant."
  );

  const TOCK_API_URL = config.TOCK_API;
  const TOCK_TOKEN = config.TOCK_TOKEN;

  const ANGRY_TOCK_TIMEZONE = config.ANGRY_TOCK_TIMEZONE || "America/New_York";
  const ANGRY_TOCK_FIRST_ALERT = moment(
    config.ANGRY_TOCK_FIRST_TIME || "10:00",
    "HH:mm"
  );
  const ANGRY_TOCK_SECOND_ALERT = moment(
    config.ANGRY_TOCK_SECOND_TIME || "16:00",
    "HH:mm"
  );

  /**
   * Shout at all the truant users.
   * @async
   * @param {Object} options
   * @param {Boolean} options.calm Whether this is Happy Tock or Angry Tock. Angry
   *   Tock is not calm. Defaults to Angry Tock.
   */
  const shout = async ({ calm = false } = {}) => {
    const message = {
      username: `${calm ? "Disappointed" : "Angry"} Tock`,
      icon_emoji: calm ? ":disappointed-tock:" : ":angrytock:",
      text: calm
        ? ":disappointed-tock: Please <https://tock.18f.gov|Tock your time>!"
        : ":angrytock: <https://tock.18f.gov|Tock your time>! You gotta!",
    };

    const tockSlackUsers = await get18FTockSlackUsers();
    const truants = await get18FTockTruants(moment.tz(ANGRY_TOCK_TIMEZONE));
    const slackableTruants = tockSlackUsers.filter((tockUser) =>
      truants.some(
        (truant) =>
          truant.email?.toLowerCase() === tockUser.email?.toLowerCase()
      )
    );

    slackableTruants.forEach(({ slack_id: slackID }) => {
      sendDirectMessage(slackID, message);
    });
  };

  const getNextShoutingDay = () => {
    // The reporting time for the current work week would be the first day of
    // that working week.
    const reportTime = moment
      .tz(getCurrentWorkWeek()[0], ANGRY_TOCK_TIMEZONE)
      .hour(ANGRY_TOCK_SECOND_ALERT.hour())
      .minute(ANGRY_TOCK_SECOND_ALERT.minute())
      .second(0);

    // If we've already passed the truancy report time for the current work week,
    // jump to the next Monday, and then scoot forward over any holidays.
    if (reportTime.isBefore(moment())) {
      reportTime.add(7, "days").day(1);
      while (holidays.isAHoliday(reportTime.toDate())) {
        reportTime.add(1, "day");
      }
    }

    return reportTime;
  };

  /**
   * Schedules the next time to shout at users.
   */
  const scheduleNextShoutingMatch = () => {
    const now = moment();
    const day = getNextShoutingDay();

    const firstHour = ANGRY_TOCK_FIRST_ALERT.hour();
    const firstMinute = ANGRY_TOCK_FIRST_ALERT.minute();

    const firstTockShoutTime = day
      .clone()
      .hour(firstHour)
      .minute(firstMinute)
      .second(0);

    const secondTockShoutTime = day
      .clone()
      .hour(ANGRY_TOCK_SECOND_ALERT.hour())
      .minute(ANGRY_TOCK_SECOND_ALERT.minute())
      .second(0);

    // If today is the normal day for Angry Tock to shout...
    if (now.isBefore(firstTockShoutTime)) {
      // ...and Angry Tock should not have shouted at all yet, schedule a calm
      // shout.
      return scheduler.scheduleJob(firstTockShoutTime.toDate(), async () => {
        await shout({ calm: true });
        setTimeout(() => scheduleNextShoutingMatch(), 1000);
      });
    }

    if (now.isBefore(secondTockShoutTime)) {
      // ...and Angry Tock should have shouted once, schedule an un-calm shout.
      return scheduler.scheduleJob(secondTockShoutTime.toDate(), async () => {
        setTimeout(() => scheduleNextShoutingMatch(), 1000);
        await shout({ calm: false });
      });
    }

    // Schedule a calm shout for the next shouting day.
    day.hour(firstHour).minute(firstMinute).second(0);

    return scheduler.scheduleJob(day.toDate(), async () => {
      setTimeout(() => scheduleNextShoutingMatch(), 1000);
      await shout({ calm: true });
    });
  };

  if (!TOCK_API_URL || !TOCK_TOKEN) {
    app.logger.warn(
      "AngryTock disabled: Tock API URL or access token is not set"
    );
    return;
  }

  scheduleNextShoutingMatch();
};
