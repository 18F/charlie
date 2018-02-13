// Description:
//   Announce when the bot starts up

const target = process.env.HUBOT_STATUS_CHANNEL || 'bots';

module.exports = (robot) => {
  robot.messageRoom(target, {
    target,
    text: 'Johnny 5 is alliiiiiive!  Also I have just booted up.'
  })
};
