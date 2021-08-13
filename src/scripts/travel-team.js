const holidays = require("@18f/us-federal-holidays");
const {
  dates: { getNow, zonedDateTimeToDate, DAYS },
} = require("../utils");

// Saturday and Sunday; day numbers are according to the Temporal spec. Weekday
// indexes now start at 1, and 0 is undefined.
const closedDays = [DAYS.Saturday, DAYS.Sunday];
const dows = [
  undefined,
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const getChannelName = (() => {
  let allChannels = null;
  return async (client, channelID) => {
    if (allChannels === null) {
      const response = await client.conversations.list();
      allChannels = response.channels.reduce(
        (channels, { id, name }) => ({ ...channels, [id]: name }),
        {}
      );
    }
    return allChannels[channelID];
  };
})();

const travelIsClosed = (day = getNow()) =>
  holidays.isAHoliday(zonedDateTimeToDate(day)) ||
  closedDays.includes(day.dayOfWeek);

const getNextWorkday = () => {
  let nextWorkDay = getNow().add({ days: 1 });
  while (travelIsClosed(nextWorkDay)) {
    nextWorkDay = nextWorkDay.add({ days: 1 });
  }
  return dows[nextWorkDay.dayOfWeek];
};

const pastResponses = [];
const getHasRespondedToUserRecently = (userID) => {
  // First, remove all previous responses that were over three hours ago
  const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
  for (let i = 0; i < pastResponses.length; i += 1) {
    if (pastResponses[i].time <= threeHoursAgo) {
      pastResponses.splice(i, 1);
      i -= 1;
    }
  }

  // Now check if any of the remaining responses are for this user
  return pastResponses.some((p) => p.user === userID);
};

module.exports = (robot) => {
  robot.message(
    /.*/,
    async ({ client, event: { channel, thread_ts: thread, user }, say }) => {
      const channelName = await getChannelName(client, channel);

      if (
        channelName === "travel" &&
        travelIsClosed() &&
        !getHasRespondedToUserRecently(user)
      ) {
        pastResponses.push({ user, time: Date.now() });
        say({
          icon_emoji: ":tts:",
          text: `Hi <@${user}>. The TTS travel team is unavailable on weekends and holidays. If you need to change your flight for approved travel, contact AdTrav at (877) 472-6716. For after-hours emergency travel authorizations, see <https://handbook.tts.gsa.gov/travel-guide-b-after-hours-emergency-travel-authorizations/|the Handbook>. For other travel-related issues, such as an approval in Concur, please drop a new message in this channel ${getNextWorkday()} morning and someone will respond promptly.`,
          thread_ts: thread,
          username: "TTS Travel Team",
        });
      }
    }
  );
};
