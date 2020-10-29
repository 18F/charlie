const { assert, expect } = require("chai");
const moment = require("moment");
const sinon = require("sinon");
const slackClient = require("@slack/client");

const utils = require("../utils");

describe("utility helpers", () => {
  const sandbox = sinon.createSandbox();

  const WebClient = sandbox.stub(slackClient, "WebClient");

  const webAPI = {
    chat: {
      postEphemeral: sandbox.spy(),
    },
  };

  const http = {
    get: sandbox.stub(),
    header: sandbox.stub(),
  };
  const httpGetCallback = sandbox.stub();

  const robot = {
    http: sandbox.stub(),
    adapter: {
      client: {
        web: {
          reactions: {
            add: sandbox.stub(),
          },
          users: {
            list: sandbox.stub(),
          },
        },
      },
      options: {
        token: "slack token",
      },
    },
  };

  let clock;
  before(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();

    WebClient.returns(webAPI);

    robot.http.returns(http);
    http.header.returns(http);
    http.get.returns(httpGetCallback);
  });

  after(() => {
    slackClient.WebClient.restore();
    clock.restore();
  });

  it("sets up utilities and returns functions", () => {
    const out = utils.setup(robot);

    expect(typeof out.addEmojiReaction === "function").to.equal(true);
    expect(typeof out.postEphemeralMessage === "function").to.equal(true);
    expect(typeof out.getSlackUsers === "function").to.equal(true);
    expect(typeof out.tock.getCurrent18FTockUsers === "function").to.equal(
      true
    );
    expect(typeof out.tock.getFromTock === "function").to.equal(true);
    expect(typeof out.tock.get18FTockSlackUsers === "function").to.equal(true);
    expect(typeof out.tock.get18FTockTruants === "function").to.equal(true);
  });

  it("posts an ephemeral message", () => {
    const { postEphemeralMessage } = utils.setup(robot);

    postEphemeralMessage("this is my magical message");

    expect(
      webAPI.chat.postEphemeral.calledWith("this is my magical message")
    ).to.equal(true);
  });

  describe("adds an emoji reaction", () => {
    let addEmojiReaction;
    beforeEach(() => {
      const out = utils.setup(robot);
      addEmojiReaction = out.addEmojiReaction;
    });

    it("rejects if there is an error posting the emoji", async () => {
      robot.adapter.client.web.reactions.add.yields("there was an error", null);

      try {
        await addEmojiReaction("emoji", "channel id", "message id");
        assert.fail("should not resolve");
      } catch (e) {
        expect(
          robot.adapter.client.web.reactions.add.calledWith(
            "emoji",
            {
              channel: "channel id",
              timestamp: "message id",
            },
            sinon.match.func
          )
        ).to.equal(true);
      }
    });

    it("rejects if Slack refuses to post the emoji", async () => {
      robot.adapter.client.web.reactions.add.yields(null, { ok: false });

      try {
        await addEmojiReaction("emoji", "channel id", "message id");
        assert.fail("should not resolve");
      } catch (e) {
        expect(
          robot.adapter.client.web.reactions.add.calledWith(
            "emoji",
            {
              channel: "channel id",
              timestamp: "message id",
            },
            sinon.match.func
          )
        ).to.equal(true);
      }
    });

    it("resolves if the emoji is added successfully", async () => {
      robot.adapter.client.web.reactions.add.yields(null, { ok: true });

      try {
        await addEmojiReaction("emoji", "channel id", "message id");
      } catch (e) {
        assert.fail("should not reject");
      }

      expect(
        robot.adapter.client.web.reactions.add.calledWith(
          "emoji",
          {
            channel: "channel id",
            timestamp: "message id",
          },
          sinon.match.func
        )
      ).to.equal(true);
    });
  });

  describe("gets a list of Slack users", () => {
    it("rejects if there is an error", async () => {
      const { getSlackUsers } = utils.setup(robot);

      const testError = new Error();
      robot.adapter.client.web.users.list.yields(testError, null);

      try {
        await getSlackUsers();
        // If the promise resolves, then we didn't successfully handle the error
        // from Slack, so fail the test.
        expect(true).to.equal(false);
      } catch (e) {
        expect(e).to.equal(testError);
      }
    });

    it("resolves a list of users if there is no error", async () => {
      const { getSlackUsers } = utils.setup(robot);

      robot.adapter.client.web.users.list.yields(null, {
        members: "here is the result",
      });

      try {
        const out = await getSlackUsers();
        expect(out).to.equal("here is the result");
      } catch (_) {
        // If the promise rejects, something wonky happened, so fail the test.
        expect(true).to.equal(false);
      }
    });
  });

  describe("Tock utility methods", () => {
    let getFromTock;
    let getCurrent18FTockUsers;
    let get18FTockTruants;
    let get18FTockSlackUsers;

    before(() => {
      process.env.HUBOT_TOCK_API = "tock-api";
      process.env.HUBOT_TOCK_TOKEN = "tock-token";

      const tockUtils = utils.setup(robot).tock;
      getFromTock = tockUtils.getFromTock;
      getCurrent18FTockUsers = tockUtils.getCurrent18FTockUsers;
      get18FTockTruants = tockUtils.get18FTockTruants;
      get18FTockSlackUsers = tockUtils.get18FTockSlackUsers;
    });

    describe("fetches data from Tock", () => {
      it("rejects if there is an error", async () => {
        const testError = new Error("test error");
        httpGetCallback.yields(testError);

        try {
          await getFromTock("/endpoint");
          expect(true).to.equal(false);
        } catch (e) {
          expect(e).to.equal(testError);
        }

        expect(robot.http.calledWith("tock-api/endpoint")).to.be.equal(true);
        expect(
          http.header.calledWith("Authorization", "Token tock-token")
        ).to.equal(true);
      });

      it("resolves if there is not an error", async () => {
        const data = { hello: "world" };
        httpGetCallback.yields(null, null, JSON.stringify(data));

        try {
          const out = await getFromTock("/endpoint");
          expect(out).to.deep.equal(data);
        } catch (e) {
          expect(true).to.equal(false);
        }

        expect(robot.http.calledWith("tock-api/endpoint")).to.be.equal(true);
        expect(
          http.header.calledWith("Authorization", "Token tock-token")
        ).to.equal(true);
      });
    });

    describe("other Tock methods that rely on the HTTP get helper", () => {
      beforeEach(() => {
        robot.adapter.client.web.users.list.yields(null, {
          members: [
            {
              deleted: false,
              id: "slack 1",
              is_bot: false,
              is_restricted: false,
              profile: { email: "email 1" },
              real_name: "user 1",
              tz: "timezone 1",
            },
            {
              deleted: false,
              id: "slack 2",
              is_bot: false,
              is_restricted: true,
              profile: { email: "email 2" },
              real_name: "user 2",
              tz: "timezone 2",
            },
            {
              deleted: false,
              id: "slack 3",
              is_bot: true,
              is_restricted: false,
              profile: { email: "email 3" },
              real_name: "user 3",
              tz: "timezone 3",
            },
            {
              deleted: true,
              id: "slack 4",
              is_bot: false,
              is_restricted: false,
              profile: { email: "email 4" },
              real_name: "user 4",
              tz: "timezone 4",
            },
            {
              deleted: false,
              id: "slack 5",
              is_bot: false,
              is_restricted: false,
              profile: { email: "email 5" },
              real_name: "user 5",
              tz: "timezone 5",
            },
          ],
        });

        robot.http.withArgs("tock-api/user_data.json").returns({
          header: sinon
            .stub()
            .withArgs("Authorization", "Token tock-token")
            .returns({
              get: sinon.stub().returns(
                sinon.stub().yields(
                  null,
                  null,
                  JSON.stringify([
                    {
                      is_18f_employee: true,
                      is_active: true,
                      current_employee: true,
                      user: "user 1",
                    },
                    {
                      is_18f_employee: false,
                      is_active: true,
                      current_employee: true,
                      user: "user 2",
                    },
                    {
                      is_18f_employee: true,
                      is_active: false,
                      current_employee: true,
                      user: "user 3",
                    },
                    {
                      is_18f_employee: true,
                      is_active: true,
                      current_employee: false,
                      user: "user 4",
                    },
                    {
                      is_18f_employee: true,
                      is_active: true,
                      current_employee: true,
                      user: "user 5",
                    },
                  ])
                )
              ),
            }),
        });

        robot.http.withArgs("tock-api/users.json").returns({
          header: sinon
            .stub()
            .withArgs("Authorization", "Token tock-token")
            .returns({
              get: sinon.stub().returns(
                sinon.stub().yields(
                  null,
                  null,
                  JSON.stringify([
                    { email: "email 1", id: 1, username: "user 1" },
                    { email: "email 2", id: 2, username: "user 2" },
                    { email: "email 3", id: 3, username: "user 3" },
                    { email: "email 4", id: 4, username: "user 4" },
                    { email: "email 5", id: 5, username: "user 5" },
                  ])
                )
              ),
            }),
        });

        robot.http
          .withArgs("tock-api/reporting_period_audit/2020-10-04.json")
          .returns({
            header: sinon
              .stub()
              .withArgs("Authorization", "Token tock-tocken")
              .returns({
                get: sinon.stub().returns(
                  sinon.stub().yields(
                    null,
                    null,
                    JSON.stringify([
                      {
                        id: 1,
                        username: "user 1",
                        email: "email 1",
                      },
                    ])
                  )
                ),
              }),
          });

        robot.http
          .withArgs("tock-api/reporting_period_audit/2020-10-11.json")
          .returns({
            header: sinon
              .stub()
              .withArgs("Authorization", "Token tock-tocken")
              .returns({
                get: sinon.stub().returns(
                  sinon.stub().yields(
                    null,
                    null,
                    JSON.stringify([
                      {
                        id: 5,
                        username: "user 5",
                        email: "email 5",
                      },
                    ])
                  )
                ),
              }),
          });
      });

      it("gets a list of active 18F Tock users", async () => {
        const users = await getCurrent18FTockUsers();
        expect(users).to.deep.equal([
          { user: "user 1", email: "email 1", tock_id: 1 },
          { user: "user 5", email: "email 5", tock_id: 5 },
        ]);
      });

      it("gets a list of 18F Tock users and their associated Slack details", async () => {
        const users = await get18FTockSlackUsers();

        expect(users).to.deep.equal([
          {
            email: "email 1",
            name: "user 1",
            slack_id: "slack 1",
            tock_id: 1,
            user: "user 1",
            tz: "timezone 1",
          },
          {
            email: "email 5",
            name: "user 5",
            slack_id: "slack 5",
            tock_id: 5,
            user: "user 5",
            tz: "timezone 5",
          },
        ]);
      });

      describe("gets a list of 18F Tock users who are truant", () => {
        it("defaults to looking at the reporting period from a week ago", async () => {
          const date = moment("2020-10-14");
          clock.tick(date.toDate().getTime());
          const truants = await get18FTockTruants(date);

          // Only user 1 is truant from the previous period.
          expect(truants).to.deep.equal([
            { id: 1, email: "email 1", username: "user 1" },
          ]);
        });

        it("defaults to looking at the reporting period from a week ago", async () => {
          const date = moment("2020-10-14");
          clock.tick(date.toDate().getTime());
          const truants = await get18FTockTruants(date, 0);

          // Only user 5 is truant in the current period.
          expect(truants).to.deep.equal([
            { id: 5, email: "email 5", username: "user 5" },
          ]);
        });
      });
    });
  });
});
