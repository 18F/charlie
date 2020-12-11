const fs = require("fs");
const chai = require("chai");
const subset = require("chai-subset");
const sinon = require("sinon");

chai.use(subset);
const { expect } = chai;

const originalUtils = require("../../utils");
const bot = require("../../scripts/inclusion-bot");

describe("Inclusion bot match loader", () => {
  before(() => {
    sinon.stub(fs, "readFileSync").returns(`inclusion-bot:
  - matches:
      - match 1.1
      - match 1.2
    alternatives:
      - alt 1.1
  - matches:
      - match 2.1
    ignore:
      - ignore 2.1
    alternatives:
      - alt 2.1
      - alt 2.2`);
  });

  after(() => {
    fs.readFileSync.restore();
  });

  it("do a thing", () => {
    const matches = bot.getMatches();
    expect(matches).to.deep.equal([
      {
        alternatives: ["alt 1.1"],
        ignore: undefined,
        matches: /(match 1.1|match 1.2)/i,
      },
      {
        alternatives: ["alt 2.1", "alt 2.2"],
        ignore: /(ignore 2.1)/gi,
        matches: /(match 2.1)/i,
      },
    ]);
  });
});

describe("Inclusion bot", () => {
  const sandbox = sinon.createSandbox();
  const robot = {
    hear: sandbox.stub(),
  };

  const addEmojiReaction = sandbox.stub();
  const postEphemeralMessage = sandbox.stub();
  let setup;

  const msg = {
    message: {
      id: "message id",
      room: "channel id",
      text: "",
      user: { id: "user id" },
    },
  };

  before(() => {
    setup = sandbox.stub(originalUtils, "setup");
    sinon.stub(bot, "getMatches").returns([
      {
        alternatives: ["a1", "a2", "a3"],
        ignore: ["not match 1"],
        matches: /(match 1)/i,
      },
      {
        alternatives: ["b1"],
        matches: /(match 2a|match 2b)/i,
      },
    ]);
  });

  after(() => {
    setup.restore();
    bot.getMatches.restore();
  });

  beforeEach(() => {
    msg.message.text = "";
    sandbox.resetBehavior();
    sandbox.resetHistory();

    setup.returns({ addEmojiReaction, postEphemeralMessage });
  });

  it("subscribes to case-insensitive utterances of uninclusive language", () => {
    bot(robot);

    expect(
      robot.hear.calledWith(
        new RegExp(/\b(match 1)|(match 2a|match 2b)\b/, "i"),
        sinon.match.func
      )
    ).to.equal(true);
  });

  describe("properly responds to triggers", () => {
    const expectedEmoji = ["inclusion-bot", "channel id", "message id"];
    const expectedMessage = {
      attachments: [
        {
          color: "#2eb886",
          text: `Hello! Our inclusive TTS culture is built one interaction at a time, and inclusive language is the foundation. Instead of language stemming from racism, sexism, ableism, or other non-inclusive roots, we encourage everyone to try out new phrases. This is a small way we build inclusion into our everyday work lives. (See the <https://docs.google.com/document/d/1MMA7f6uUj-EctzhtYNlUyIeza6R8k4wfo1OKMDAgLog/edit#|inclusion bot document> for more info. *Content warning: offensive language.*)`,
          fallback: `Hello! Our inclusive TTS culture is built one interaction at a time, and inclusive language is the foundation. Instead of language stemming from racism, sexism, ableism, or other non-inclusive roots, we encourage everyone to try out new phrases. This is a small way we build inclusion into our everyday work lives. (See the <https://docs.google.com/document/d/1MMA7f6uUj-EctzhtYNlUyIeza6R8k4wfo1OKMDAgLog/edit#|inclusion bot document> for more info. *Content warning: offensive language.*)`,
        },
      ],
      as_user: false,
      channel: "channel id",
      icon_emoji: ":tts:",
      user: "user id",
      username: "Inclusion Bot",
      unfurl_links: false,
      unfurl_media: false,
    };

    let handler;
    beforeEach(() => {
      bot(robot);
      handler = robot.hear.args[0][1];
    });

    it("handles a single triggering phrase", () => {
      msg.message.text = "hello this is the match 1 trigger";
      handler(msg);

      expect(addEmojiReaction.calledWith(...expectedEmoji)).to.equal(true);
      const message = postEphemeralMessage.args[0][0];
      expect(message).to.containSubset(expectedMessage);
      expect(message.attachments[0].pretext).to.match(
        /• Instead of saying "match 1," how about \*(a1|a2|a3)\*? \(_<https:\/\/web\.archive\.org\/web\/20170714141744\/https:\/\/18f\.gsa\.gov\/2016\/01\/12\/hacking-inclusion-by-customizing-a-slack-bot\/|What's this\?>_\)/
      );
    });

    it("handles a single triggering phrase that should be explicitly ignored", () => {
      msg.message.text = "hello this is the not match 1 trigger";
      handler(msg);

      expect(addEmojiReaction.called).to.equal(false);
      expect(postEphemeralMessage.called).to.equal(false);
    });

    it("handles two triggering phrases", () => {
      msg.message.text = "hello this is the match 1 trigger and match 2a";
      handler(msg);

      expect(addEmojiReaction.calledWith(...expectedEmoji)).to.equal(true);
      const message = postEphemeralMessage.args[0][0];
      expect(message).to.containSubset(expectedMessage);
      expect(message.attachments[0].pretext).to.match(
        /• Instead of saying "match 1," how about \*(a1|a2|a3)\*?\n• Instead of saying "match 2a," how about \*b1\*? \(_<https:\/\/web\.archive\.org\/web\/20170714141744\/https:\/\/18f\.gsa\.gov\/2016\/01\/12\/hacking-inclusion-by-customizing-a-slack-bot\/|What's this\?>_\)/
      );
    });

    it("handles two triggering phrases where one is explicitly ignored", () => {
      msg.message.text = "hello this is the not match 1 trigger and match 2a";
      handler(msg);

      expect(addEmojiReaction.calledWith(...expectedEmoji)).to.equal(true);
      const message = postEphemeralMessage.args[0][0];
      expect(message).to.containSubset(expectedMessage);
      expect(message.attachments[0].pretext).to.match(
        /• Instead of saying "match 2a," how about \*b1\*? \(_<https:\/\/web\.archive\.org\/web\/20170714141744\/https:\/\/18f\.gsa\.gov\/2016\/01\/12\/hacking-inclusion-by-customizing-a-slack-bot\/|What's this\?>_\)/
      );
    });
  });
});
