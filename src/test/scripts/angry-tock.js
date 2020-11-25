const expect = require("chai").expect;
const moment = require("moment-timezone");
const sinon = require("sinon");
const scheduler = require("node-schedule");
const originalUtils = require("../../utils");

describe("Angry Tock", () => {
  const sandbox = sinon.createSandbox();

  const robot = {
    logger: { info: sandbox.spy(), warning: sandbox.spy() },
    messageRoom: sandbox.spy(),
  };

  const slackUsers = [
    {
      deleted: false,
      is_restricted: false,
      is_bot: false,
      id: "slack1",
      real_name: "User 1",
      profile: {
        email: "user@one",
      },
    },
    {
      deleted: false,
      is_restricted: false,
      is_bot: false,
      id: "slack2",
      real_name: "User 2",
      profile: {
        email: "user@two",
      },
    },
    {
      deleted: false,
      is_restricted: false,
      is_bot: false,
      id: "slack3",
      real_name: "User 3",
      profile: {
        email: "user@three",
      },
    },
    {
      deleted: true,
      is_restricted: false,
      is_bot: false,
      id: "deleted user",
      real_name: "deleted user",
      profile: {
        email: "user@deleted",
      },
    },
    {
      deleted: false,
      is_restricted: true,
      is_bot: false,
      id: "restricted user",
      real_name: "restricted user",
      profile: {
        email: "user@restricted",
      },
    },
    {
      deleted: false,
      is_restricted: false,
      is_bot: true,
      id: "bot user",
      real_name: "bot user",
      profile: {
        email: "user@bot",
      },
    },
  ];

  const tock18Fusers = [
    { email: "user@one", id: "tock1", user: "employee1" },
    { email: "user@two", id: "tock2", user: "employee2" },
    { email: "user@three", id: "tock3", user: "employee3" },
    { email: "user@four", id: "tock4", user: "employee4" },
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
    {
      id: "tock4",
      email: "user@four",
      first_name: "User",
      last_name: "Four",
      username: "employee4",
    },
  ];

  const tock18FSlackUsers = [
    {
      email: "user@one",
      id: "tock1",
      name: "User 1",
      slack_id: "slack1",
      user: "employee1",
    },
    {
      email: "user@two",
      id: "tock2",
      name: "User 2",
      slack_id: "slack2",
      user: "employee2",
    },
    {
      email: "user@three",
      id: "tock3",
      name: "User 3",
      slack_id: "slack3",
      user: "employee3",
    },
  ];

  const getCurrent18FTockUsers = sandbox.stub();
  const getSlackUsers = sandbox.stub();
  const get18FTockSlackUsers = sandbox.stub();
  const get18FTockTruants = sandbox.stub();

  let clock;
  let setup;
  before(() => {
    clock = sinon.useFakeTimers();
    setup = sinon.stub(originalUtils, "setup");

    process.env.ANGRY_TOCK_REPORT_TO = "#channel,@user";
  });

  beforeEach(() => {
    sandbox.spy(scheduler, "scheduleJob");

    process.env.HUBOT_TOCK_API = "tock url";
    process.env.HUBOT_TOCK_TOKEN = "tock token";
    process.env.ANGRY_TOCK_TIMEZONE = "Asia/Tokyo";
    process.env.ANGRY_TOCK_FIRST_TIME = "10:00";
    process.env.ANGRY_TOCK_SECOND_TIME = "14:45";

    setup.returns({
      getSlackUsers,
      tock: {
        getCurrent18FTockUsers,
        get18FTockSlackUsers,
        get18FTockTruants,
      },
    });

    getCurrent18FTockUsers.resolves(tock18Fusers);
    getSlackUsers.resolves(slackUsers);
    get18FTockTruants.resolves(tock18FTruants);
    get18FTockSlackUsers.resolves(tock18FSlackUsers);
  });

  afterEach(() => {
    clock.reset();
    sandbox.resetHistory();
    sandbox.restore();
  });

  after(() => {
    clock.restore();
    setup.restore();
  });

  const loadAngryTock = () => {
    delete require.cache[require.resolve("../../scripts/angry-tock")];
    return require("../../scripts/angry-tock"); // eslint-disable-line global-require
  };

  it("issues a warning and does not schedule a shouting match if un/mis-configured", () => {
    process.env.HUBOT_TOCK_API = "";
    process.env.HUBOT_TOCK_TOKEN = "";
    let angryTock = loadAngryTock();
    angryTock(robot);
    expect(robot.logger.warning.called).to.equal(true);
    expect(scheduler.scheduleJob.called).to.equal(false);

    process.env.HUBOT_TOCK_API = "set";
    process.env.HUBOT_TOCK_TOKEN = "";
    angryTock = loadAngryTock();
    angryTock(robot);
    expect(robot.logger.warning.called).to.equal(true);
    expect(scheduler.scheduleJob.called).to.equal(false);

    process.env.HUBOT_TOCK_API = "";
    process.env.HUBOT_TOCK_TOKEN = "set";
    angryTock = loadAngryTock();
    angryTock(robot);
    expect(robot.logger.warning.called).to.equal(true);
    expect(scheduler.scheduleJob.called).to.equal(false);
  });

  describe("schedules the next shouting match on startup", () => {
    it("if it is shouty day and before first-shout time, schedules a first-shout", () => {
      // Monday, April 8, 1974: Hank Aaron hits his 715th career homerun,
      // breaking Babe Ruth's record.
      const time = moment.tz(
        "1974-04-08 00:00:00",
        process.env.ANGRY_TOCK_TIMEZONE
      );
      clock.tick(time.toDate().getTime());

      const angryTock = loadAngryTock();
      angryTock(robot);

      time.hour(10);
      expect(
        scheduler.scheduleJob.calledWith(time.toDate(), sinon.match.func)
      ).to.equal(true);
    });

    it("if it is shouty day, after the first-shout time but before the second-shout time, schedules a second-shout", () => {
      // Monday, May 20, 1991: Michael Jordan named NBA MVP.
      const time = moment.tz(
        "1991-05-20 11:00:00",
        process.env.ANGRY_TOCK_TIMEZONE
      );
      clock.tick(time.toDate().getTime());

      const angryTock = loadAngryTock();
      angryTock(robot);

      time.hour(14);
      time.minute(45);
      expect(
        scheduler.scheduleJob.calledWith(time.toDate(), sinon.match.func)
      ).to.equal(true);
    });

    it("if it is not shouty, schedules a first-shout for the next shouty day", () => {
      // Friday, October 18, 2019 - First all-female spacewalk conducted by NASA
      // astronauts Christina Koch and Jessica Meir outside of the Internaional
      // Space Station.
      const initial = moment.tz(
        "2019-10-18 09:00:00",
        process.env.ANGRY_TOCK_TIMEZONE
      );
      clock.tick(initial.toDate().getTime());

      const angryTock = loadAngryTock();
      angryTock(robot);

      // Monday, October 21, 2019 - World's oldest natural pearl, dated at 8,000
      // years old, is found new Abu Dhabi.
      const scheduled = moment.tz(
        "2019-10-21 10:00:00",
        process.env.ANGRY_TOCK_TIMEZONE
      );
      expect(
        scheduler.scheduleJob.calledWith(scheduled.toDate(), sinon.match.func)
      ).to.equal(true);
    });
  });

  it("engages in a series of shouting matches over time, as appopriate", async () => {
    // Monday, May 1, 1978 - Ernest Nathan Morial, first African-American mayor
    // of New Orleans, is inaugurated.
    const initial = moment.tz(
      "1978-05-01 09:00:00",
      process.env.ANGRY_TOCK_TIMEZONE
    );
    clock.tick(initial.toDate().getTime());

    const angryTock = loadAngryTock();
    angryTock(robot);

    // We advance to Monday at 10:00 and we should have gotten some DMs. Tick
    // asynchronously so it breaks to event loop, allowing all the internal
    // promises and callbacks to resolve before we run our assertions.
    await clock.tickAsync(moment.duration({ hours: 1 }).asMilliseconds());

    expect(robot.messageRoom.callCount).to.equal(2);

    expect(
      robot.messageRoom.calledWith("slack1", {
        username: "Disappointed Tock",
        icon_emoji: ":disappointed-tock:",
        text:
          ":disappointed-tock: Please <https://tock.18f.gov|Tock your time>!",
        as_user: false,
      })
    ).to.equal(true);

    expect(
      robot.messageRoom.calledWith("slack2", {
        username: "Disappointed Tock",
        icon_emoji: ":disappointed-tock:",
        text:
          ":disappointed-tock: Please <https://tock.18f.gov|Tock your time>!",
        as_user: false,
      })
    ).to.equal(true);

    // Reset stub history, then advance to the second shout and make sure we got
    // some more DMs.
    robot.messageRoom.resetHistory();
    await clock.tickAsync(
      moment.duration({ hours: 4, minutes: 45 }).asMilliseconds()
    );

    expect(robot.messageRoom.callCount).to.equal(4);

    expect(
      robot.messageRoom.calledWith("slack1", {
        username: "Angry Tock",
        icon_emoji: ":angrytock:",
        text: ":angrytock: <https://tock.18f.gov|Tock your time>! You gotta!",
        as_user: false,
      })
    ).to.equal(true);

    expect(
      robot.messageRoom.calledWith("slack2", {
        username: "Angry Tock",
        icon_emoji: ":angrytock:",
        text: ":angrytock: <https://tock.18f.gov|Tock your time>! You gotta!",
        as_user: false,
      })
    ).to.equal(true);

    const reportMessage = {
      attachments: [
        {
          fallback:
            "• <@slack1> (notified on Slack)\n• <@slack2> (notified on Slack)\n• employee4 (not notified)",
          color: "#FF0000",
          text:
            "• <@slack1> (notified on Slack)\n• <@slack2> (notified on Slack)\n• employee4 (not notified)",
        },
      ],
      username: "Angry Tock",
      icon_emoji: ":angrytock:",
      text: "*The following users are currently truant on Tock:*",
      as_user: false,
    };

    expect(robot.messageRoom.calledWith("#channel", reportMessage)).to.equal(
      true
    );
    expect(robot.messageRoom.calledWith("@user", reportMessage)).to.equal(true);

    // Reset stub history, then advance to next week's first shout and make
    // sure we got fresh happy DMs.
    robot.messageRoom.resetHistory();
    await clock.tickAsync(
      moment.duration({ days: 6, hours: 19, minutes: 15 }).asMilliseconds()
    );

    expect(robot.messageRoom.callCount).to.equal(2);

    expect(
      robot.messageRoom.calledWith("slack1", {
        username: "Disappointed Tock",
        icon_emoji: ":disappointed-tock:",
        text:
          ":disappointed-tock: Please <https://tock.18f.gov|Tock your time>!",
        as_user: false,
      })
    ).to.equal(true);

    expect(
      robot.messageRoom.calledWith("slack2", {
        username: "Disappointed Tock",
        icon_emoji: ":disappointed-tock:",
        text:
          ":disappointed-tock: Please <https://tock.18f.gov|Tock your time>!",
        as_user: false,
      })
    ).to.equal(true);

    // Last time. Advance to the secound shouting. This finishes all the shouty
    // routes through the bot and we can be done.
    robot.messageRoom.resetHistory();

    // But first, clear out the truants, so we can test the case where Angry
    // Tock's rage is sated and Happy Tock returns.
    get18FTockTruants.resolves([]);

    await clock.tickAsync(
      moment.duration({ hours: 4, minutes: 45 }).asMilliseconds()
    );

    expect(robot.messageRoom.callCount).to.equal(2);

    const happyMessage = {
      username: "Happy Tock",
      icon_emoji: ":happy-tock:",
      text: "No Tock truants!",
      as_user: false,
    };

    expect(robot.messageRoom.calledWith("#channel", happyMessage)).to.equal(
      true
    );
    expect(robot.messageRoom.calledWith("@user", happyMessage)).to.equal(true);
  });
});
