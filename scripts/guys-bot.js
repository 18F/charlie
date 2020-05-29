const utils = require('../utils');

const guysRegex = /(?<!boba )(?<!five )(?<!5 )(?<!halal )guy(s|z)(?=[^"“”']*(["“”'][^"“”']*["“”'][^"“”']*)*$)/i;

module.exports = robot => {
  const { addEmojiReaction, postEphemeralMessage } = utils.setup(robot);

  robot.hear(/guy[sz]/i, msg => {
    if (!guysRegex.test(msg.message.text)) {
      return;
    }

    addEmojiReaction('inclusion-bot', msg.message.room, msg.message.id);

    postEphemeralMessage({
      attachments: [
        {
          color: '#2eb886',
          pretext: `Did you mean *y'all*? (_<https://web.archive.org/web/20170714141744/https://18f.gsa.gov/2016/01/12/hacking-inclusion-by-customizing-a-slack-bot/|What's this?>_)`,
          text: `Hello! Our inclusive TTS culture is built one interaction at a time, and inclusive language is the foundation. Instead of guys, we encourage everyone to try out a new phrase to describe multiple people. This is a small way we build inclusion into our everyday work lives.          `,
          fallback: `Hello! Our inclusive TTS culture is built one interaction at a time, and inclusive language is the foundation. Instead of guys, we encourage everyone to try out a new phrase to describe multiple people. This is a small way we build inclusion into our everyday work lives.`
        }
      ],
      as_user: false,
      channel: msg.message.room,
      icon_emoji: ':tts:',
      user: msg.message.user.id,
      username: 'Inclusion Bot',
      unfurl_links: false,
      unfurl_media: false
    });
  });
};
