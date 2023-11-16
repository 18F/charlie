const { directMention } = require("@slack/bolt");
const {
  helpMessage,
  stats: { incrementStats },
} = require("../utils");

const pugs = [
  "https://i.imgur.com/kXngLij.png",
  "https://i.imgur.com/3wR2qg8.jpg",
  "https://i.imgur.com/vMnlr1D.png",
  "https://i.imgur.com/Fhhg2D4.png",
  "https://i.imgur.com/LxVSPck.png",
  "https://i.imgur.com/Fihh8o1.png",
  "https://i.imgur.com/jUzKI5Z.png",
  "https://i.imgur.com/x8VRFM1.png",
  "https://i.imgur.com/dpM7RQU.png",
  "https://i.imgur.com/zUN5r5p.png", // 10
  "https://i.imgur.com/Z6CRlh1.png",
  "https://i.imgur.com/3zXJqqU.png",
  "https://i.imgur.com/Ok7I6H2.png",
  "https://i.imgur.com/7Rn8WGV.png",
  "https://i.imgur.com/8b7dm9l.png", // 15
  "https://i.imgur.com/2NmdgpY.png",
  "https://i.imgur.com/WtjRob1.png",
  "https://i.imgur.com/9EFvd5s.png",
  "https://i.imgur.com/G27DsB2.png",
  "https://i.imgur.com/Jy2ssIK.png",
];

const makePugs = (count = 1) =>
  [...Array(count)].map(() => ({
    type: "image",
    title: { type: "plain_text", text: "a pug!" },
    image_url: pugs[Math.floor(Math.random() * pugs.length)],
    alt_text: "a pug",
  }));

module.exports = (app) => {
  helpMessage.registerInteractive(
    "Pug Me",
    "pug me",
    "Do you like pugs? Do you want a picture of a pug? Charlie can satisfy your craving with a random picture of a cute pug!",
    true,
  );
  helpMessage.registerInteractive(
    "Pug Bomb",
    "pug bomb <number>",
    "Do you love pugs so much that you want to see several of them? Charlie can deliver! Defaults to three cutes.",
    true,
  );

  app.message(directMention(), /pug me/i, async ({ say }) => {
    incrementStats("pug bot: one");
    say({ blocks: makePugs() });
  });

  app.message(directMention(), /pug bomb ?(\d+)?/i, ({ context, say }) => {
    incrementStats("pug bot: multiple");
    const count = +context.matches[1] || 3;
    say({ blocks: makePugs(count) });
  });
};
