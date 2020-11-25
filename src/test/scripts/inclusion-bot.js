const fs = require("fs");
const path = require("path");
const chai = require("chai");
const subset = require("chai-subset");
const sinon = require("sinon");
const yaml = require("js-yaml");

chai.use(subset);
const { assert, expect } = chai;

const originalUtils = require("../../utils");
const bot = require("../../scripts/inclusion-bot");

describe("Inclusion bot config file", () => {
  const ymlStr = fs.readFileSync(
    path.join(
      path.dirname(require.resolve("../../scripts/inclusion-bot")),
      "inclusion-bot.yaml"
    )
  );
  const yml = yaml.safeLoad(ymlStr, { json: true });

  it("starts with a top-level triggers property", () => {
    expect(Object.keys(yml).length).to.equal(3);
    expect(Array.isArray(yml.triggers)).to.equal(true);
  });

  it("each item is an object, and each property of each object is a string", () => {
    const { triggers } = yml;
    triggers.forEach((trigger, i) => {
      assert(typeof trigger === "object", `item ${i} is an object`);

      const keys = Object.keys(trigger);
      assert(keys.indexOf("matches") >= 0, `item ${i} has matches`);
      assert(Array.isArray(trigger.matches), `item ${i}'s matches is an array`);
      assert(keys.indexOf("alternatives") >= 0, `item ${i} has alternatives`);
      assert(
        Array.isArray(trigger.alternatives),
        `item ${i}'s alternatives is an array`
      );

      trigger.matches.forEach((s, j) => {
        assert(typeof s === "string", `item ${i}, match ${j} is a string`);
      });
      trigger.alternatives.forEach((s, j) => {
        assert(
          typeof s === "string",
          `item ${i}, alternatives ${j} is a string`
        );
      });

      if (trigger.ignore) {
        assert(Array.isArray(trigger.ignore), `item ${i}'s ignore is an array`);
        trigger.ignore.forEach((s, j) => {
          assert(typeof s === "string", `item ${i}, ignore ${j} is a string`);
        });
      }

      const expectedKeyCount = trigger.ignore ? 3 : 2;
      assert(
        keys.length === expectedKeyCount,
        `item ${i} has exactly ${expectedKeyCount} keys`
      );
    });
  });
});

describe("Inclusion bot match loader", () => {
  before(() => {
    sinon.stub(fs, "readFileSync").returns(`
link: https://link.url
message: "This is the message"

triggers:
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

  it("maps the YAML file to the right format", () => {
    const matches = bot.getTriggers();
    expect(matches).to.deep.equal({
      link: "https://link.url",
      message: "This is the message",
      triggers: [
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
      ],
    });
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
    sinon.stub(bot, "getTriggers").returns({
      link: "http://link.url",
      message: "This is the message",
      triggers: [
        {
          alternatives: ["a1", "a2", "a3"],
          ignore: ["not match 1"],
          matches: /(match 1)/i,
        },
        {
          alternatives: ["b1"],
          matches: /(match 2a|match 2b)/i,
        },
      ],
    });
  });

  after(() => {
    setup.restore();
    bot.getTriggers.restore();
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
          text: "This is the message",
          fallback: "This is the message",
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
      expect(message.attachments[0].text).to.match(
        /• Instead of saying "match 1," how about \*(a1|a2|a3)\*? \(_<https:\/\/link\.url|What's this\?>_\)/
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
      expect(message.attachments[0].text).to.match(
        /• Instead of saying "match 1," how about \*(a1|a2|a3)\*?\n• Instead of saying "match 2a," how about \*b1\*? \(_<https:\/\/link\.url|What's this\?>_\)/
      );
    });

    it("handles two triggering phrases where one is explicitly ignored", () => {
      msg.message.text = "hello this is the not match 1 trigger and match 2a";
      handler(msg);

      expect(addEmojiReaction.calledWith(...expectedEmoji)).to.equal(true);
      const message = postEphemeralMessage.args[0][0];
      expect(message).to.containSubset(expectedMessage);
      expect(message.attachments[0].text).to.match(
        /• Instead of saying "match 2a," how about \*b1\*? \(_<https:\/\/link\.url|What's this\?>_\)/
      );
    });
  });
});
