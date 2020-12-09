const chai = require("chai");
const subset = require("chai-subset");
const sinon = require("sinon");

chai.use(subset);
const { expect } = chai;

const originalUtils = require("../../utils");
const guysBot = require("../../scripts/inclusion-bot");

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
  });

  beforeEach(() => {
    msg.message.text = "";
    sandbox.resetBehavior();
    sandbox.resetHistory();

    setup.returns({ addEmojiReaction, postEphemeralMessage });
  });

  it("subscribes to case-insensitive utterances of uninclusive language", () => {
    guysBot(robot);

    expect(
      robot.hear.calledWith(new RegExp(/\bguy[sz]\b/, "i"), sinon.match.func)
    ).to.equal(true);

    expect(
      robot.hear.calledWith(new RegExp(/\b(lame)\b/, "i"), sinon.match.func)
    ).to.equal(true);

    expect(
      robot.hear.calledWith(
        new RegExp(/\b(psycho|psychotic)\b/, "i"),
        sinon.match.func
      )
    ).to.equal(true);
  });

  const expectedEmoji = ["inclusion-bot", "channel id", "message id"];
  const expectedTextRegex = /Did you mean \*[^*]+\*\? \(_<https:\/\/web\.archive\.org\/web\/20170714141744\/https:\/\/18f\.gsa\.gov\/2016\/01\/12\/hacking-inclusion-by-customizing-a-slack-bot\/\|What's this\?>_\)/;
  const expectedMessage = {
    attachments: [
      {
        color: "#2eb886",
        text: `Hello! Our inclusive TTS culture is built one interaction at a time, and inclusive language is the foundation. Instead of guys, we encourage everyone to try out a new phrase to describe multiple people. This is a small way we build inclusion into our everyday work lives.`,
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

  describe("guys bot", () => {
    describe("guys bot handler", () => {
      let handler;

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

      it("does respond to just guys", () => {
        msg.message.text = "hello guys";
        handler(msg);
        const message = postEphemeralMessage.args[0][0];
        expect(message).to.containSubset(expectedMessage);
        expect(message.attachments[0].pretext).to.match(expectedTextRegex);
        expect(addEmojiReaction.calledWith(...expectedEmoji)).to.equal(true);
      });

      it("does respond to just guys with capitals", () => {
        msg.message.text = "hello GuYs";
        handler(msg);
        const message = postEphemeralMessage.args[0][0];
        expect(message).to.containSubset(expectedMessage);
        expect(message.attachments[0].pretext).to.match(expectedTextRegex);
        expect(addEmojiReaction.calledWith(...expectedEmoji)).to.equal(true);
      });

      it("does respond to just guyz", () => {
        msg.message.text = "hello guyz";
        handler(msg);
        const message = postEphemeralMessage.args[0][0];
        expect(message).to.containSubset(expectedMessage);
        expect(message.attachments[0].pretext).to.match(expectedTextRegex);
        expect(addEmojiReaction.calledWith(...expectedEmoji)).to.equal(true);
      });

      it("does respond to just guyz with capitals", () => {
        msg.message.text = "hello gUyZ";
        handler(msg);
        const message = postEphemeralMessage.args[0][0];
        expect(message).to.containSubset(expectedMessage);
        expect(message.attachments[0].pretext).to.match(expectedTextRegex);
        expect(addEmojiReaction.calledWith(...expectedEmoji)).to.equal(true);
      });
    });
  });
});
