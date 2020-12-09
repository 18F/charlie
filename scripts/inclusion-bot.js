const utils = require("../utils");

const bots = [
  {
    // "guys bot"
    hear: /\bguy[sz]\b/,
    regex: /(?<!boba )(?<!five )(?<!5 )(?<!halal )guy(s|z)(?=[^"“”']*(["“”'][^"“”']*["“”'][^"“”']*)*$)/i,
    alternatives: ["y'all"],
  },
  {
    hear: /\b(lame)\b/,
    alternatives: ["cruddy"],
  },
  {
    hear: /\b(crazy|psycho|psychotic)\b/,
    alternatives: ["chaotic"],
  },
];

module.exports = (robot) => {
  const { addEmojiReaction, postEphemeralMessage } = utils.setup(robot);

  bots.forEach(({ hear, regex, alternatives }) => {
    robot.hear(new RegExp(hear, "i"), (msg) => {
      if (regex && !regex.test(msg.message.text)) {
        return;
      }

      addEmojiReaction("inclusion-bot", msg.message.room, msg.message.id);

      const alternative =
        alternatives[Math.floor(Math.random() * alternatives.length)];

      postEphemeralMessage({
        attachments: [
          {
            color: "#2eb886",
            pretext: `Did you mean *${alternative}*? (_<https://web.archive.org/web/20170714141744/https://18f.gsa.gov/2016/01/12/hacking-inclusion-by-customizing-a-slack-bot/|What's this?>_)`,
            text: `Hello! Our inclusive TTS culture is built one interaction at a time, and inclusive language is the foundation. Instead of guys, we encourage everyone to try out a new phrase to describe multiple people. This is a small way we build inclusion into our everyday work lives.`,
            fallback: `Hello! Our inclusive TTS culture is built one interaction at a time, and inclusive language is the foundation. Instead of guys, we encourage everyone to try out a new phrase to describe multiple people. This is a small way we build inclusion into our everyday work lives.`,
          },
        ],
        as_user: false,
        channel: msg.message.room,
        icon_emoji: ":tts:",
        user: msg.message.user.id,
        username: "Inclusion Bot",
        unfurl_links: false,
        unfurl_media: false,
      });
    });
  });
};
