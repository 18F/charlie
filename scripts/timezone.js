const moment = require("moment-timezone");
const utils = require("../utils");

const TIMEZONES = {
  at: "America/Puerto_Rico",
  adt: "America/Puerto_Rico",
  ast: "America/Puerto_Rico",
  ct: "America/Chicago",
  cdt: "America/Chicago",
  cst: "America/Chicago",
  et: "America/New_York",
  edt: "America/New_York",
  est: "America/New_York",
  mt: "America/Denver",
  mdt: "America/Denver",
  mst: "America/Denver",
  pt: "America/Los_Angeles",
  pdt: "America/Los_Angeles",
  pst: "America/Los_Angeles",
};

module.exports = (robot) => {
  const { getSlackUsersInConversation, postEphemeralMessage } = utils.setup(
    robot
  );

  robot.hear(/(\d{1,2}:\d{2}\s?(am|pm)?)\s?([acemp](s|d)?t)?/i, async (msg) => {
    const [, time, ampm, timezone] = msg.match;

    const sourceTz = timezone
      ? TIMEZONES[timezone.toLowerCase()]
      : msg.message.user.slack.tz;

    const m = moment.tz(
      `${time.trim()}${ampm ? ` ${ampm}` : ""}`,
      "hh:mm a",
      sourceTz
    );

    const users = (await getSlackUsersInConversation(msg.message.room))
      .filter(({ deleted, id, is_bot: bot, tz }) => {
        if (deleted || bot) {
          return false;
        }

        // If the timezone was specified in the message, filter out the people
        // who are in that timezone.
        if (timezone) {
          if (tz === sourceTz) {
            return false;
          }
        } else if (id === msg.message.user.id) {
          return false;
        }

        return true;
      })
      .map(({ id, tz }) => ({ id, tz }));

    users.forEach(({ id, tz }) => {
      postEphemeralMessage({
        as_user: false,
        channel: msg.message.room,
        icon_emoji: ":timebot:",
        user: id,
        username: "Handy Tau-bot",
        text: `That's ${m
          .clone()
          .tz(tz)
          .format(`h:mm${ampm ? " a" : ""}`)} for you!`,
      });
    });
  });
};
