const expect = require("chai").expect;
const moment = require("moment-timezone");
const sinon = require("sinon");
const scheduler = require("node-schedule");
const originalUtils = require("../../utils");

const load = () => {
  delete require.cache[require.resolve("../../scripts/optimistic-tock")];
  return require("../../scripts/optimistic-tock"); // eslint-disable-line global-require
};

describe("Optimistic Tock", () => {
  const sandbox = sinon.createSandbox();

  const robot = {
    logger: { info: sandbox.spy(), warning: sandbox.spy() },
    messageRoom: sandbox.spy(),
  };

  const slackUsers = [
    {
      deleted: false,
      id: "slack 1",
      tz: "America/New_York",
    },
    {
      deleted: false,
      id: "slack 2",
      tz: "America/Chicago",
    },
    {
      deleted: false,
      id: "slack 3",
      tz: "America/Los_Angeles",
    },
    {
      deleted: true,
      id: "slack 4",
      tz: "America/Denver",
    },
    {
      deleted: false,
      id: "slack 5",
      tz: "America/New_York",
    },
  ];

  const tock18FTruants = [
    {
      id: "tock1",
      email: "user@one",
      first_name: "User",
      last_name: "One",
      username: "employee1",
    },
    {
      id: "tock2",
      email: "user@two",
      first_name: "User",
      last_name: "Two",
      username: "employee2",
    },
  ];

  const tock18FSlackUsers = [
    {
      email: "user@one",
      id: "tock1",
      name: "User 1",
      slack_id: "slack 1",
      user: "employee1",
    },
    {
      email: "user@two",
      id: "tock2",
      name: "User 2",
      slack_id: "slack 2",
      user: "employee2",
    },
    {
      email: "user@three",
      id: "tock3",
      name: "User 3",
      slack_id: "slack 3",
      user: "employee3",
    },
    {
      email: "user@five",
      id: "tock5",
      name: "User 5",
      slack_id: "slack 5",
      user: "employee5",
    },
  ];

  const getSlackUsers = sandbox.stub();
  const get18FTockSlackUsers = sandbox.stub();
  const get18FTockTruants = sandbox.stub();

  let clock;
  let setup;
  before(() => {
    clock = sinon.useFakeTimers();
    setup = sinon.stub(originalUtils, "setup");
    sandbox.spy(scheduler, "scheduleJob");
  });

  beforeEach(() => {
    process.env.HUBOT_TOCK_API = "tock url";
    process.env.HUBOT_TOCK_TOKEN = "tock token";
    process.env.ANGRY_TOCK_TIMEZONE = "Asia/Tokyo";
    process.env.ANGRY_TOCK_FIRST_TIME = "10:00";
    process.env.ANGRY_TOCK_SECOND_TIME = "14:45";

    setup.returns({
      getSlackUsers,
      tock: {
        get18FTockSlackUsers,
        get18FTockTruants,
      },
    });

    getSlackUsers.resolves(slackUsers);
    get18FTockTruants.resolves(tock18FTruants);
    get18FTockSlackUsers.resolves(tock18FSlackUsers);
  });

  afterEach(() => {
    clock.reset();
    sandbox.resetHistory();
  });

  after(() => {
    clock.restore();
    setup.restore();
    sandbox.restore();
  });

  it("issues a warning and does not schedule a shouting match if un/mis-configured", () => {
    process.env.HUBOT_TOCK_API = "";
    process.env.HUBOT_TOCK_TOKEN = "";
    let optimisticTock = load();
    optimisticTock(robot);
    expect(robot.logger.warning.called).to.equal(true);
    expect(scheduler.scheduleJob.called).to.equal(false);

    process.env.HUBOT_TOCK_API = "set";
    process.env.HUBOT_TOCK_TOKEN = "";
    optimisticTock = load();
    optimisticTock(robot);
    expect(robot.logger.warning.called).to.equal(true);
    expect(scheduler.scheduleJob.called).to.equal(false);

    process.env.HUBOT_TOCK_API = "";
    process.env.HUBOT_TOCK_TOKEN = "set";
    optimisticTock = load();
    optimisticTock(robot);
    expect(robot.logger.warning.called).to.equal(true);
    expect(scheduler.scheduleJob.called).to.equal(false);
  });

  describe("it schedules future reminders", () => {
    it("for the next Friday if it is not a holiday", async () => {
      // The Bell System is broken up by antitrust action.
      const time = moment.tz("1984-01-01T12:00:00", "America/New_York");
      clock.tick(time.toDate().getTime());

      const times = [
        moment.tz("1984-01-06T15:30:00", "America/New_York").toDate(),
        moment.tz("1984-01-06T15:30:00", "America/Chicago").toDate(),
        moment.tz("1984-01-06T15:30:00", "America/Los_Angeles").toDate(),
      ];

      await load()(robot);

      // There are 5 users. One is deleted. Of the remaining 4 users, there are
      // only three distinct timezones, so there should only be three scheduled
      // reminders.
      expect(scheduler.scheduleJob.callCount).to.equal(3);

      times.forEach((scheduledTime) => {
        expect(
          scheduler.scheduleJob.calledWith(scheduledTime, sinon.match.func)
        ).to.equal(true);
      });
    });

    it("for the next Thursday if Friday is a holiday", async () => {
      // I don't know if this is a significant date, but July 4 was a Friday
      // in 1986, so it meets our test criteria.
      const time = moment.tz("1986-07-01T12:00:00", "America/New_York");
      clock.tick(time.toDate().getTime());

      const times = [
        moment.tz("1986-07-03T15:30:00", "America/New_York").toDate(),
        moment.tz("1986-07-03T15:30:00", "America/Chicago").toDate(),
        moment.tz("1986-07-03T15:30:00", "America/Los_Angeles").toDate(),
      ];

      await load()(robot);

      // There are 5 users. One is deleted. Of the remaining 4 users, there are
      // only three distinct timezones, so there should only be three scheduled
      // reminders.
      expect(scheduler.scheduleJob.callCount).to.equal(3);

      times.forEach((scheduledTime) => {
        expect(
          scheduler.scheduleJob.calledWith(scheduledTime, sinon.match.func)
        ).to.equal(true);
      });
    });
  });

  it("sends a friendly reminder when it's time to tock", async () => {
    // The Bell System is broken up by antitrust action.
    const time = moment.tz("1984-01-01T12:00:00", "America/New_York");
    clock.tick(time.toDate().getTime());

    await load()(robot);

    // Don't fiddle with the clock. That's node-schedule's job. Instead, grab
    // the first scheduled job and check that it behaves as expected.
    const reminderFunction = scheduler.scheduleJob.args[0][1];
    await reminderFunction();

    // It should remind our New_York timezone users who have not yet tocked.
    // There's just one of those.
    expect(
      robot.messageRoom.calledWith("slack 1", {
        as_user: false,
        icon_emoji: "happytock",
        text: "Don't forget to <https://tock.18f.gov|Tock your time>!",
        username: "Happy Tock",
      })
    ).to.equal(true);
    expect(robot.messageRoom.callCount).to.equal(1);
  });
});
