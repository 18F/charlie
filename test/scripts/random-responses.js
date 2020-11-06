const sinon = require("sinon");
const expect = require("chai").expect;

const script = require("../../scripts/random-responses");

describe("random responder", () => {
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  describe("response builder", () => {
    const res = {
      random: sandbox.stub(),
      send: sandbox.spy(),
    };

    const config = { botName: null, defaultEmoji: null };
    beforeEach(() => {
      config.botName = null;
      config.defaultEmoji = null;
    });

    const responsePermutations = [
      ["simple string response", 1, "a message", { text: "a message" }],
      [
        "string with emoji",
        2,
        ":emoji: b message",
        { text: "b message", icon_emoji: ":emoji:", as_user: false },
      ],
      [
        "message object with no name or emoji",
        3,
        { text: "c message" },
        { text: "c message" },
      ],
      [
        "message object with no name",
        4,
        { text: "d message", emoji: ":emoji:" },
        { text: "d message", icon_emoji: ":emoji:", as_user: false },
      ],
      [
        "message object with no emoji",
        5,
        { text: "e message", name: "bob" },
        { text: "e message", username: "bob", as_user: false },
      ],
      [
        "full message object",
        6,
        { text: "f message", emoji: ":emoji:", name: "bob" },
        {
          text: "f message",
          icon_emoji: ":emoji:",
          username: "bob",
          as_user: false,
        },
      ],
    ];

    describe("with no config", () => {
      responsePermutations.forEach(
        ([responseName, responses, returned, expected]) => {
          it(responseName, async () => {
            res.random.returns(returned);
            await script.responseFrom(
              {},
              { ...config, responseList: responses }
            )(res);
            expect(res.random.calledWith(responses)).to.eql(true);
            expect(res.send.calledWith(expected)).to.eql(true);
          });
        }
      );
    });

    describe("with default emoji set", () => {
      const baseExpectation = { icon_emoji: ":default-emoji:", as_user: false };

      responsePermutations.forEach(
        ([responseName, responses, returned, expected]) => {
          it(responseName, async () => {
            config.defaultEmoji = ":default-emoji:";
            res.random.returns(returned);
            await script.responseFrom(
              {},
              { ...config, responseList: responses }
            )(res);

            expect(res.random.calledWith(responses)).to.eql(true);
            expect(
              res.send.calledWith({ ...baseExpectation, ...expected })
            ).to.eql(true);
          });
        }
      );
    });

    describe("with bot name set", () => {
      const baseExpectation = { username: "bot name", as_user: false };

      responsePermutations.forEach(
        ([responseName, responses, returned, expected]) => {
          it(responseName, async () => {
            config.botName = "bot name";
            if (expected.username) {
              expected.username += " (bot name)"; // eslint-disable-line no-param-reassign
            }
            res.random.returns(returned);
            await script.responseFrom(
              {},
              { ...config, responseList: responses }
            )(res);

            expect(res.random.calledWith(responses)).to.eql(true);
            expect(
              res.send.calledWith(
                sinon.match({ ...baseExpectation, ...expected })
              )
            ).to.eql(true);
          });
        }
      );
    });
  });

  describe("response getter", () => {
    it("gets responses directly from config", async () => {
      const responses = await script.getResponses(
        {},
        { responseList: "these are my responses" }
      );
      expect(responses).to.eql("these are my responses");
    });

    it("gets responses from a url", async () => {
      const http = sandbox.stub();
      const header = sandbox.stub();
      const get = sandbox.stub();
      const then = sandbox.stub();

      const robot = { http };
      http.returns({ get, header });
      header.returns({ get, header });
      get.returns(then);

      then.callsArgWith(0, null, null, '{"key1":"value 1","key2":"value 2"}');

      const responses = await script.getResponses(robot, {
        responseUrl: "over there",
      });

      expect(http.calledWith("over there")).to.eql(true);
      expect(header.calledWith("User-Agent", "18F-bot")).to.eql(true);
      expect(responses).to.eql({ key1: "value 1", key2: "value 2" });
    });

    it("gets cached responses from a url", async () => {
      const responses = await script.getResponses(
        {},
        {
          responseUrl: "over there",
        }
      );
      expect(responses).to.eql({ key1: "value 1", key2: "value 2" });
    });

    it("returns an empty list if misconfigured", async () => {
      const responses = await script.getResponses({}, {});

      expect(responses).to.eql([]);
    });
  });

  describe("trigger attachment", () => {
    const robot = {
      hear: sandbox.spy(),
    };

    it("handles a single text trigger", () => {
      script.attachTrigger(robot, { trigger: "one trigger" });
      expect(robot.hear.calledWith(/one trigger/i, sinon.match.func)).to.eql(
        true
      );
    });

    it("handles a single regex trigger", () => {
      script.attachTrigger(robot, { trigger: /one regex/g });
      expect(robot.hear.calledWith(/one regex/i, sinon.match.func)).to.eql(
        true
      );
    });

    it("handles an array of text triggers", () => {
      script.attachTrigger(robot, {
        trigger: ["trigger 1", "trigger 2", "trigger 3"],
      });
      expect(robot.hear.calledWith(/trigger 1/i, sinon.match.func)).to.eql(
        true
      );
      expect(robot.hear.calledWith(/trigger 2/i, sinon.match.func)).to.eql(
        true
      );
      expect(robot.hear.calledWith(/trigger 3/i, sinon.match.func)).to.eql(
        true
      );
    });

    it("handles an array of regex triggers", () => {
      script.attachTrigger(robot, {
        trigger: [/trigger 1/g, /trigger 2/g, /trigger 3/g],
      });
      expect(robot.hear.calledWith(/trigger 1/i, sinon.match.func)).to.eql(
        true
      );
      expect(robot.hear.calledWith(/trigger 2/i, sinon.match.func)).to.eql(
        true
      );
      expect(robot.hear.calledWith(/trigger 3/i, sinon.match.func)).to.eql(
        true
      );
    });
  });
});
