const {
  optOut,
  slack: { getSlackUsersInConversation, postEphemeralMessage },
} = require("../utils");

const TIMEZONES = {
  akt: "America/Anchorage",
  akst: "America/Anchorage",
  akdt: "America/Anchorage",
  at: "America/Puerto_Rico",
  adt: "America/Puerto_Rico",
  ast: "America/Puerto_Rico",
  ":central-time-zone:": "America/Chicago",
  ct: "America/Chicago",
  cdt: "America/Chicago",
  cst: "America/Chicago",
  ":eastern-time-zone:": "America/New_York",
  et: "America/New_York",
  edt: "America/New_York",
  est: "America/New_York",
  ":mountain-time-zone:": "America/Denver",
  mt: "America/Denver",
  mdt: "America/Denver",
  mst: "America/Denver",
  ":pacific-time-zone:": "America/Los_Angeles",
  pt: "America/Los_Angeles",
  pdt: "America/Los_Angeles",
  pst: "America/Los_Angeles",
};

const timeString = (zonedDateTime, ampm) => {
  const { hour: h, minute } = Temporal.PlainTime.from(zonedDateTime);

  let ampmStr = "";
  if (ampm) {
    if (h < 12) {
      ampmStr = " am";
    } else {
      ampmStr = " pm";
    }
  }

  const hour = h === 0 ? 12 : h;

  return `${hour > 12 ? hour - 12 : hour}:${
    minute > 10 ? "" : "0"
  }${minute}${ampmStr}`;
};

const matcher =
  /(\d{1,2}):(\d{2})\s?(am|pm)?\s?(((ak|a|c|e|m|p)(s|d)?t)|:(eastern|central|mountain|pacific)-time-zone:)?/i;

module.exports = (app) => {
  const optout = optOut("handy_tau_bot");

  app.message(matcher, async (msg) => {
    const { channel, text, thread_ts: thread, user } = msg.event;

    const {
      user: { tz: authorTimezone },
    } = await msg.client.users.info({ user });

    let users = await getSlackUsersInConversation(msg);
    let m = null;
    let ampm = null;

    const matches = [...text.matchAll(RegExp(matcher, "gi"))];

    // If there aren't any matches, that can be because this was crossposted.
    // We don't want to have the bot respond to those because the authorship of
    // the message (and thus the origin timezone) gets goofy.
    if (matches.length === 0) {
      return;
    }

    matches.forEach(([, h, min, ampmStr, timezone]) => {
      const sourceTz = timezone
        ? TIMEZONES[timezone.toLowerCase()]
        : authorTimezone;

      if (m === null) {
        ampm = ampmStr;

        let hour = +h;
        const minute = +min;

        if (ampm?.toLowerCase() === "pm" && hour < 12) {
          hour += 12;
        } else if (ampm?.toLowerCase() === "am" && hour === 12) {
          hour = 0;
        }

        if (hour > 23 || minute > 59) {
          return;
        }

        m = Temporal.Now.instant()
          .toZonedDateTime({ calendar: "iso8601", timeZone: sourceTz })
          .withPlainTime({ hour, minute });
      }

      users = users
        .filter(({ deleted, id, is_bot: bot, tz }) => {
          if (deleted || bot) {
            return false;
          }

          if (optout.isOptedOut(id)) {
            return false;
          }

          // If the timezone was specified in the message, filter out the people
          // who are in that timezone.
          if (timezone) {
            if (tz === sourceTz) {
              return false;
            }
          } else if (id === user) {
            return false;
          }

          return true;
        })
        .map(({ id, tz }) => ({ id, tz }));
    });

    // if the detected time is invalid, nothing should be sent to users
    if (!m) {
      return;
    }

    users.forEach(({ id, tz }) => {
      postEphemeralMessage({
        channel,
        icon_emoji: ":timebot:",
        user: id,
        username: "Handy Tau-bot",
        text: `That's ${timeString(
          m.withTimeZone({ timeZone: tz }),
          ampm
        )} for you!`,
        thread_ts: thread,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `That's ${timeString(
                m.withTimeZone({ timeZone: tz }),
                ampm
              )} for you!`,
            },
            ...optout.button,
          },
        ],
      });
    });
  });
};
