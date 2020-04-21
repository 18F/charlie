const holidays = require('@18f/us-federal-holidays');
const moment = require('moment');

const closedDays = ['Saturday', 'Sunday'];

const getChannelName = (() => {
  let allRooms = null;
  return async (robot, roomID) => {
    if (allRooms === null) {
      await new Promise((resolve, reject) => {
        robot.adapter.client.web.conversations.list((err, res) => {
          if (err) {
            reject(err);
          }
          allRooms = res.channels.reduce(
            (rooms, { id, name }) => ({
              ...rooms,
              [id]: name
            }),
            {}
          );
          resolve();
        });
      });
    }

    return allRooms[roomID];
  };
})();

const travelIsClosed = () =>
  holidays.isAHoliday() || closedDays.includes(moment().format('dddd'));

const getNextWorkday = () => {
  const m = moment().add(1, 'day');
  while (
    closedDays.includes(m.format('dddd')) ||
    holidays.isAHoliday(m.toDate())
  ) {
    m.add(1, 'day');
  }
  return m.format('dddd');
};

const pastResponses = [];
const getHasRespondedToUserRecently = userID => {
  // First, remove all previous responses that were over three hours ago
  const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
  for (let i = 0; i < pastResponses.length; i += 1) {
    if (pastResponses[i].time <= threeHoursAgo) {
      pastResponses.splice(i, 1);
      i -= 1;
    }
  }

  // Now check if any of the remaining responses are for this user
  return pastResponses.some(p => p.user === userID);
};

module.exports = robot => {
  robot.hear(/.*/, async msg => {
    const channel = await getChannelName(robot, msg.message.room);
    const user = msg.message.user.id;

    if (
      channel === 'travel' &&
      travelIsClosed() &&
      !getHasRespondedToUserRecently(user)
    ) {
      pastResponses.push({ user, time: Date.now() });
      msg.send({
        as_user: false,
        icon_emoji: ':tts:',
        text: `Hi <@${user}>. The TTS travel team is unavailable on weekends and holidays. If you need to change your flight for approved travel, contact AdTrav at (877) 472-6716. For after-hours emergency travel authorizations, see <https://handbook.tts.gsa.gov/travel-guide-b-after-hours-emergency-travel-authorizations/|the Handbook>. For other travel-related issues, such as an approval in Concur, please drop a new message in this channel ${getNextWorkday()} morning and someone will respond promptly.`,
        username: 'TTS Travel Team'
      });
    }
  });
};
