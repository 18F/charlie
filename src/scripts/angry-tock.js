const holidays = require("@18f/us-federal-holidays");
const scheduler = require("node-schedule");
const {
  dates: { DAYS },
  slack: { postMessage, sendDirectMessage },
  tock: { get18FTockSlackUsers, get18FTockTruants },
} = require("../utils");

const TOCK_API_URL = process.env.TOCK_API;
const TOCK_TOKEN = process.env.TOCK_TOKEN;

const ANGRY_TOCK_TIMEZONE =
  process.env.ANGRY_TOCK_TIMEZONE || "America/New_York";
const ANGRY_TOCK_FIRST_ALERT = Temporal.PlainTime.from(
  process.env.ANGRY_TOCK_FIRST_TIME || "10:00"
);
const ANGRY_TOCK_SECOND_ALERT = Temporal.PlainTime.from(
  process.env.ANGRY_TOCK_SECOND_TIME || "16:00"
);

const ANGRY_TOCK_REPORT_TO = (
  process.env.ANGRY_TOCK_REPORT_TO || "#18f-supes"
).split(",");
const HAPPY_TOCK_REPORT_TO = (process.env.HAPPY_TOCK_REPORT_TO || "#18f").split(
  ","
);

const dateFromZonedDateTime = (zonedDateTime) =>
  new Date(Date.parse(zonedDateTime.toInstant()));

/**
 * Get the current time in the configured timezone.
 * @returns {Temporal.ZonedDateTime} A Temporal object representing the current
 *   time in the configured timezone.
 */
const m = () =>
  Temporal.Now.instant().toZonedDateTime({
    calendar: "iso8601",
    timeZone: ANGRY_TOCK_TIMEZONE,
  });

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
  const truants = await get18FTockTruants(m());
  const slackableTruants = tockSlackUsers.filter((tockUser) =>
    truants.some((truant) => truant.email === tockUser.email)
  );

  slackableTruants.forEach(({ slack_id: slackID }) => {
    sendDirectMessage(slackID, message);
  });

  if (!calm) {
    if (truants.length > 0) {
      const nonSlackableTruants = truants.filter(
        (truant) =>
          !slackableTruants.some(
            (slackableTruant) => slackableTruant.email === truant.email
          )
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
      };
      ANGRY_TOCK_REPORT_TO.forEach((channel) => {
        postMessage({ ...truantReport, channel });
      });
    } else {
      [...ANGRY_TOCK_REPORT_TO, ...HAPPY_TOCK_REPORT_TO].forEach((channel) => {
        postMessage({
          username: "Happy Tock",
          icon_emoji: ":happy-tock:",
          text: "No Tock truants!",
          channel,
        });
      });
    }
  }
};

/**
 * Gets whether or not a given date/time is a Angry Tock shouting day.
 * @param {Temporal.ZonedDateTime} now The date/time to check, as a Temporal.ZonedDateTime object
 * @returns {Boolean} True if the passed date/time is a good day for shouting
 */
const isAngryTockDay = (now) => {
  const d = now || m();
  return (
    d.dayOfWeek === DAYS.Monday &&
    !holidays.isAHoliday(dateFromZonedDateTime(m()))
  );
};

/**
 * Schedules the next time to shout at users.
 */
const scheduleNextShoutingMatch = () => {
  const day = m();

  const firstTockShoutTime = day.withPlainTime(ANGRY_TOCK_FIRST_ALERT);
  const secondTockShoutTime = day.withPlainTime(ANGRY_TOCK_SECOND_ALERT);

  let next = day;

  if (isAngryTockDay(day)) {
    // If today is the normal day for Angry Tock to shout...
    if (Temporal.ZonedDateTime.compare(day, firstTockShoutTime) < 0) {
      // ...and Angry Tock should not have shouted at all yet, schedule a calm
      // shout.
      return scheduler.scheduleJob(
        dateFromZonedDateTime(firstTockShoutTime),
        async () => {
          await shout({ calm: true });
          setTimeout(() => scheduleNextShoutingMatch(), 1000);
        }
      );
    }
    if (Temporal.ZonedDateTime.compare(day, secondTockShoutTime) < 0) {
      // if (day.isBefore(secondTockShoutTime)) {
      // ...and Angry Tock should have shouted once, schedule an un-calm shout.
      return scheduler.scheduleJob(
        dateFromZonedDateTime(secondTockShoutTime),
        async () => {
          setTimeout(() => scheduleNextShoutingMatch(), 1000);
          await shout({ calm: false });
        }
      );
    }

    // ...and Angry Tock should have shouted twice already, advance a day and
    // schedule a shout for next week.
    next = next.add({ days: 1 });
  }

  // ...and Angry Tock should have already shouted twice today, advance to the
  // next shouting day.
  while (!isAngryTockDay(next)) {
    next = next.add({ days: 1 });
  }

  // Schedule a calm shout for the next shouting day.
  next = next.withPlainTime(ANGRY_TOCK_FIRST_ALERT);

  return scheduler.scheduleJob(dateFromZonedDateTime(next), async () => {
    setTimeout(() => scheduleNextShoutingMatch(), 1000);
    await shout({ calm: true });
  });
};

module.exports = (app) => {
  if (!TOCK_API_URL || !TOCK_TOKEN) {
    app.logger.warn(
      "AngryTock disabled: Tock API URL or access token is not set"
    );
    return;
  }

  scheduleNextShoutingMatch();
};
