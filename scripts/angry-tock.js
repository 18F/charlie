const holidays = require("@18f/us-federal-holidays");
const moment = require("moment-timezone");
const scheduler = require("node-schedule");
const utils = require("../utils");

const TOCK_API_URL = process.env.HUBOT_TOCK_API;
const TOCK_TOKEN = process.env.HUBOT_TOCK_TOKEN;

const ANGRY_TOCK_TIMEZONE =
  process.env.ANGRY_TOCK_TIMEZONE || "America/New_York";
const ANGRY_TOCK_FIRST_ALERT = moment(
  process.env.ANGRY_TOCK_FIRST_TIME || "10:00",
  "HH:mm"
);
const ANGRY_TOCK_SECOND_ALERT = moment(
  process.env.ANGRY_TOCK_SECOND_TIME || "16:00",
  "HH:mm"
);

const ANGRY_TOCK_REPORT_TO = (
  process.env.ANGRY_TOCK_REPORT_TO || "#18f-supes"
).split(",");

let util;

/**
 * Get the current time in the configured timezone.
 * @returns {Moment} A moment object representing the current time in the
 *   configured timezone.
 */
const m = () => moment.tz(ANGRY_TOCK_TIMEZONE);

/**
 * Shout at all the truant users.
 * @async
 * @param {Object} options
 * @param {Boolean} options.calm Whether this is Happy Tock or Angry Tock. Angry
 *   Tock is not calm. Defaults to Angry Tock.
 */
let shout = (robot) => {
  shout = async ({ calm = false } = {}) => {
    const message = {
      username: `${calm ? "Disappointed" : "Angry"} Tock`,
      icon_emoji: calm ? ":disappointed-tock:" : ":angrytock:",
      text: calm
        ? ":disappointed-tock: Please <https://tock.18f.gov|Tock your time>!"
        : ":angrytock: <https://tock.18f.gov|Tock your time>! You gotta!",
      as_user: false,
    };

    const tockSlackUsers = await util.tock.get18FTockSlackUsers();
    const truants = await util.tock.get18FTockTruants(m());
    const slackableTruants = tockSlackUsers.filter((tu) =>
      truants.some((t) => t.email === tu.email)
    );

    slackableTruants.forEach(({ slack_id: slackID }) => {
      robot.messageRoom(slackID, message);
    });

    if (!calm) {
      if (truants.length > 0) {
        const nonSlackableTruants = truants.filter(
          (t) => !slackableTruants.some((s) => s.email === t.email)
        );

        const report = [];
        slackableTruants.forEach((u) =>
          report.push([`• <@${u.slack_id}> (notified on Slack)`])
        );
        nonSlackableTruants.forEach((u) =>
          report.push([`• ${u.username} (not notified)`])
        );

        const truantReport = {
          attachments: [
            {
              fallback: report.join("\n"),
              color: "#FF0000",
              text: report.join("\n"),
            },
          ],
          username: "Angry Tock",
          icon_emoji: ":angrytock:",
          text: "*The following users are currently truant on Tock:*",
          as_user: false,
        };
        ANGRY_TOCK_REPORT_TO.forEach((room) => {
          robot.messageRoom(room, truantReport);
        });
      } else {
        ANGRY_TOCK_REPORT_TO.forEach((room) => {
          robot.messageRoom(room, {
            username: "Happy Tock",
            icon_emoji: ":happy-tock:",
            text: "No Tock truants!",
            as_user: false,
          });
        });
      }
    }
  };
};

/**
 * Gets whether or not a given date/time is a Angry Tock shouting day.
 * @param {Moment} now The date/time to check, as a Moment object
 * @returns {Boolean} True if the passed date/time is a good day for shouting
 */
const isAngryTockDay = (now) => {
  const d = now || m();
  return d.format("dddd") === "Monday" && !holidays.isAHoliday();
};

/**
 * Schedules the next time to shout at users.
 */
const scheduleNextShoutingMatch = () => {
  const day = moment.tz(ANGRY_TOCK_TIMEZONE);

  const firstHour = ANGRY_TOCK_FIRST_ALERT.hour();
  const firstMinute = ANGRY_TOCK_FIRST_ALERT.minute();
  const firstTockShoutTime = day.clone();
  firstTockShoutTime.hour(firstHour);
  firstTockShoutTime.minute(firstMinute);
  firstTockShoutTime.second(0);

  const secondHour = ANGRY_TOCK_SECOND_ALERT.hour();
  const secondMinute = ANGRY_TOCK_SECOND_ALERT.minute();
  const secondTockShoutTime = day.clone();
  secondTockShoutTime.hour(secondHour);
  secondTockShoutTime.minute(secondMinute);
  secondTockShoutTime.second(0);

  if (isAngryTockDay(day)) {
    // If today is the normal day for Angry Tock to shout...
    if (day.isBefore(firstTockShoutTime)) {
      // ...and Angry Tock should not have shouted at all yet, schedule a calm
      // shout.
      return scheduler.scheduleJob(firstTockShoutTime.toDate(), () => {
        shout({ calm: true });
        setTimeout(() => scheduleNextShoutingMatch(), 1000);
      });
    }
    if (day.isBefore(secondTockShoutTime)) {
      // ...and Angry Tock should have shouted once, schedule an un-calm shout.
      return scheduler.scheduleJob(secondTockShoutTime.toDate(), () => {
        shout({ calm: false });
        setTimeout(() => scheduleNextShoutingMatch(), 1000);
      });
    }

    // ...and Angry Tock should have shouted twice already, advance a day and
    // schedule a shout for next week.
    day.add(1, "day");
  }

  // ...and Angry Tock should have already shouted twice today, advance to the
  // next shouting day.
  while (!isAngryTockDay(day)) {
    day.add(1, "day");
  }

  // Schedule a calm shout for the next shouting day.
  day.hour(firstHour);
  day.minute(firstMinute);
  day.second(0);

  return scheduler.scheduleJob(day.toDate(), () => {
    shout({ calm: true });
    setTimeout(() => scheduleNextShoutingMatch(), 1000);
  });
};

module.exports = async (robot) => {
  if (!TOCK_API_URL || !TOCK_TOKEN) {
    robot.logger.warning(
      "AngryTock disabled: Tock API URL or access token is not set"
    );
    return;
  }

  util = utils.setup(robot);

  robot.logger.info("AngryTock starting up");

  // Setup the shouty method, to create a closure around the robot object.
  shout(robot);

  scheduleNextShoutingMatch();
};
