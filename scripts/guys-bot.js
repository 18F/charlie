const utils = require("../utils");

const guysRegex = /guy(s|z)(?=[^"“”']*(["“”'][^"“”']*["“”'][^"“”']*)*$)/i;

const phrasesToIgnore = [
  /boba guy(s|z)/gi,
  /(five|5) guy(s|z)/gi,
  /halal guy(s|z)/gi,
  /guy(s|z) bot/gi,
  /guy(s|z)bot(s|z)?/gi,
];

const collectiveNouns = ["folks", "friends", "people", "team", `y'all`];

module.exports = (robot) => {
  const { addEmojiReaction, postEphemeralMessage } = utils.setup(robot);

  robot.hear(/guy[sz]/i, (msg) => {
    const preprocessed = phrasesToIgnore.reduce(
      (str, ignore) => str.replace(ignore, ""),
      msg.message.text
    );

    if (!guysRegex.test(preprocessed)) {
      return;
    }

    addEmojiReaction("inclusion-bot", msg.message.room, msg.message.id);

    const noun =
      collectiveNouns[Math.floor(Math.random() * collectiveNouns.length)];

    postEphemeralMessage({
      attachments: [
        {
          color: "#2eb886",
          pretext: `Did you mean *${noun}*? (_<https://web.archive.org/web/20170714141744/https://18f.gsa.gov/2016/01/12/hacking-inclusion-by-customizing-a-slack-bot/|What's this?>_)`,
          text: `Hello! Our inclusive TTS culture is built one interaction at a time, and inclusive language is the foundation. Instead of guys, we encourage everyone to try out a new phrase to describe multiple people. This is a small way we build inclusion into our everyday work lives.          `,
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
};
