const expect = require("chai").expect;
const sinon = require("sinon");

const originalUtils = require("../../utils");
const guysBot = require("../../scripts/guys-bot");

describe("Inclusion/guys bot", () => {
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
  });

  beforeEach(() => {
    msg.message.text = "";
    sandbox.resetBehavior();
    sandbox.resetHistory();

    setup.returns({ addEmojiReaction, postEphemeralMessage });
  });

  it('subscribes to case-insensitive utterances of "guys"', () => {
    guysBot(robot);
    expect(robot.hear.calledWith(/guy[sz]/i, sinon.match.func)).to.equal(true);
  });

  describe("guys bot handler", () => {
    let handler;

    const expectedEmoji = ["inclusion-bot", "channel id", "message id"];

    const expectedMessage = {
      attachments: [
        {
          color: "#2eb886",
          pretext: `Did you mean *y'all*? (_<https://web.archive.org/web/20170714141744/https://18f.gsa.gov/2016/01/12/hacking-inclusion-by-customizing-a-slack-bot/|What's this?>_)`,
          text: `Hello! Our inclusive TTS culture is built one interaction at a time, and inclusive language is the foundation. Instead of guys, we encourage everyone to try out a new phrase to describe multiple people. This is a small way we build inclusion into our everyday work lives.          `,
          fallback: `Hello! Our inclusive TTS culture is built one interaction at a time, and inclusive language is the foundation. Instead of guys, we encourage everyone to try out a new phrase to describe multiple people. This is a small way we build inclusion into our everyday work lives.`,
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

    beforeEach(() => {
      guysBot(robot);
      handler = robot.hear.args[0][1];
    });

    after(() => {
      originalUtils.setup.restore();
    });

    it('does not respond to "guys" in quotes', () => {
      ["guys", "guyz"].forEach((guy) => {
        msg.message.text = `this has "${guy}" in double quotes`;
        handler(msg);
        expect(postEphemeralMessage.called).to.equal(false);

        msg.message.text = `this has '${guy}' in single quotes`;
        handler(msg);
        expect(postEphemeralMessage.called).to.equal(false);

        msg.message.text = `this has “${guy}” in smart quotes`;
        handler(msg);
        expect(postEphemeralMessage.called).to.equal(false);
      });
    });

    it("does not respond to boba guys", () => {
      msg.message.text = `this is about boba guys, not the other kind`;
      handler(msg);
      expect(postEphemeralMessage.called).to.equal(false);
      expect(addEmojiReaction.called).to.equal(false);

      msg.message.text = `this is about Boba guys, not the other kind`;
      handler(msg);
      expect(postEphemeralMessage.called).to.equal(false);
      expect(addEmojiReaction.called).to.equal(false);
    });

    it("does not respond to Halal guys", () => {
      msg.message.text = `this is about Halal guys, not the other kind`;
      handler(msg);
      expect(postEphemeralMessage.called).to.equal(false);
      expect(addEmojiReaction.called).to.equal(false);
    });

    it("does not respond to five guys", () => {
      msg.message.text = `this is about 5 guys, not the other kind`;
      handler(msg);
      expect(postEphemeralMessage.called).to.equal(false);
      expect(addEmojiReaction.called).to.equal(false);

      msg.message.text = `this is about five guys, not the other kind`;
      handler(msg);
      expect(postEphemeralMessage.called).to.equal(false);
      expect(addEmojiReaction.called).to.equal(false);
    });

    it("does not respond to guysbot", () => {
      msg.message.text = "this is about the guys bot itself";
      handler(msg);
      expect(postEphemeralMessage.called).to.equal(false);
      expect(addEmojiReaction.called).to.equal(false);

      msg.message.text = "this is about the guyz bot itself";
      handler(msg);
      expect(postEphemeralMessage.called).to.equal(false);
      expect(addEmojiReaction.called).to.equal(false);

      msg.message.text = "this is about the guysbot itself";
      handler(msg);
      expect(postEphemeralMessage.called).to.equal(false);
      expect(addEmojiReaction.called).to.equal(false);

      msg.message.text = "this is about the guyzbot itself";
      handler(msg);
      expect(postEphemeralMessage.called).to.equal(false);
      expect(addEmojiReaction.called).to.equal(false);
    });

    it("does respond to just guys", () => {
      msg.message.text = "hello guys";
      handler(msg);
      expect(postEphemeralMessage.calledWith(expectedMessage)).to.equal(true);
      expect(addEmojiReaction.calledWith(...expectedEmoji)).to.equal(true);
    });

    it("does respond to just guys with capitals", () => {
      msg.message.text = "hello GuYs";
      handler(msg);
      expect(postEphemeralMessage.calledWith(expectedMessage)).to.equal(true);
      expect(addEmojiReaction.calledWith(...expectedEmoji)).to.equal(true);
    });

    it("does respond to just guyz", () => {
      msg.message.text = "hello guyz";
      handler(msg);
      expect(postEphemeralMessage.calledWith(expectedMessage)).to.equal(true);
      expect(addEmojiReaction.calledWith(...expectedEmoji)).to.equal(true);
    });

    it("does respond to just guyz with capitals", () => {
      msg.message.text = "hello gUyZ";
      handler(msg);
      expect(postEphemeralMessage.calledWith(expectedMessage)).to.equal(true);
      expect(addEmojiReaction.calledWith(...expectedEmoji)).to.equal(true);
    });
  });
});
