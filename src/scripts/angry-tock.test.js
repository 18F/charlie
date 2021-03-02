const moment = require("moment-timezone");
const sinon = require("sinon");
const scheduler = require("node-schedule");

const {
  getApp,
  utils: {
    slack: { postMessage, sendDirectMessage },
    tock: { get18FTockSlackUsers, get18FTockTruants },
  },
} = require("../utils/test");

describe("Angry Tock", () => {
  const load = async () =>
    new Promise((resolve) => {
      jest.isolateModules(() => {
        const module = require("./angry-tock"); // eslint-disable-line global-require
        resolve(module);
      });
    });

  const app = getApp();
  const scheduleJob = jest.spyOn(scheduler, "scheduleJob");
  let clock;

  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    clock.reset();
    jest.resetAllMocks();

    process.env.TOCK_API = "tock url";
    process.env.TOCK_TOKEN = "tock token";
    process.env.ANGRY_TOCK_REPORT_TO = "#channel,@user";
    process.env.ANGRY_TOCK_TIMEZONE = "Asia/Tokyo";
    process.env.ANGRY_TOCK_FIRST_TIME = "10:00";
    process.env.ANGRY_TOCK_SECOND_TIME = "14:45";
    process.env.HAPPY_TOCK_REPORT_TO = "#happy";

    get18FTockTruants.mockResolvedValue([
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
    ]);

    get18FTockSlackUsers.mockResolvedValue([
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
    ]);
  });

  afterAll(() => {
    clock.restore();
  });

  describe("issues a warning and does not schedule a shouting match if un/mis-configured", () => {
    it("if there is neither a Tock API URL or token", async () => {
      process.env.TOCK_API = "";
      process.env.TOCK_TOKEN = "";
      const angryTock = await load();
      angryTock(app);
      expect(app.logger.warn).toHaveBeenCalled();
      expect(scheduleJob).not.toHaveBeenCalled();
    });

    it("if there is a Tock API URL but no token", async () => {
      process.env.TOCK_API = "set";
      process.env.TOCK_TOKEN = "";
      const angryTock = await load();
      angryTock(app);
      expect(app.logger.warn).toHaveBeenCalled();
      expect(scheduleJob).not.toHaveBeenCalled();
    });

    it("if there is a Tock token but no API URL", async () => {
      process.env.TOCK_API = "";
      process.env.TOCK_TOKEN = "set";
      const angryTock = await load();
      angryTock(app);
      expect(app.logger.warn).toHaveBeenCalled();
      expect(scheduleJob).not.toHaveBeenCalled();
    });
  });

  describe("schedules the next shouting match on startup", () => {
    it("if it is shouty day and before first-shout time, schedules a first-shout", async () => {
      // Monday, April 8, 1974: Hank Aaron hits his 715th career homerun,
      // breaking Babe Ruth's record.
      const time = moment.tz(
        "1974-04-08 00:00:00",
        process.env.ANGRY_TOCK_TIMEZONE
      );
      clock.tick(time.toDate().getTime());

      const angryTock = await load();
      angryTock(app);

      time.hour(10);
      expect(scheduleJob).toHaveBeenCalledWith(
        time.toDate(),
        expect.any(Function)
      );
    });

    it("if it is shouty day, after the first-shout time but before the second-shout time, schedules a second-shout", async () => {
      // Monday, May 20, 1991: Michael Jordan named NBA MVP.
      const time = moment.tz(
        "1991-05-20 11:00:00",
        process.env.ANGRY_TOCK_TIMEZONE
      );
      clock.tick(time.toDate().getTime());

      const angryTock = await load();
      angryTock(app);

      time.hour(14);
      time.minute(45);
      expect(scheduleJob).toHaveBeenCalledWith(
        time.toDate(),
        expect.any(Function)
      );
    });

    it("if it is shouty day, after the second-shout time, schedules a first-shout for the next shouty day", async () => {
      // Monday, January 20, 1997 - Bill Clinton is sworn into his second term
      // as President of the United States.
      // Angry Tock is not location aware, but inauguration day is a holiday for
      // DC-area federal employees. So... just a note for the future!
      const initial = moment.tz(
        "1997-01-27 20:00:00",
        process.env.ANGRY_TOCK_TIMEZONE
      );
      clock.tick(initial.toDate().getTime());

      const angryTock = await load();
      angryTock(app);

      // Monday, February 3, 1997 - Cornell University faculty, staff, and
      // students gathered for a public memorial for Carl Sagan.
      const scheduled = moment.tz(
        "1997-02-03 10:00:00",
        process.env.ANGRY_TOCK_TIMEZONE
      );
      expect(scheduleJob).toHaveBeenCalledWith(
        scheduled.toDate(),
        expect.any(Function)
      );
    });

    it("if it is not shouty, schedules a first-shout for the next shouty day", async () => {
      // Friday, October 18, 2019 - First all-female spacewalk conducted by NASA
      // astronauts Christina Koch and Jessica Meir outside of the Internaional
      // Space Station.
      const initial = moment.tz(
        "2019-10-18 09:00:00",
        process.env.ANGRY_TOCK_TIMEZONE
      );
      clock.tick(initial.toDate().getTime());

      const angryTock = await load();
      angryTock(app);

      // Monday, October 21, 2019 - World's oldest natural pearl, dated at 8,000
      // years old, is found new Abu Dhabi.
      const scheduled = moment.tz(
        "2019-10-21 10:00:00",
        process.env.ANGRY_TOCK_TIMEZONE
      );
      expect(scheduleJob).toHaveBeenCalledWith(
        scheduled.toDate(),
        expect.any(Function)
      );
    });
  });

  it("sends a calm/disappointed message first, then an angry message and truant report", async () => {
    // Monday, May 1, 1978 - Ernest Nathan Morial, first African-American mayor
    // of New Orleans, is inaugurated.
    const initial = moment.tz(
      "1978-05-01 09:00:00",
      process.env.ANGRY_TOCK_TIMEZONE
    );
    clock.tick(initial.toDate().getTime());

    const angryTock = await load();
    angryTock(app);

    // This should have scheduled a calm "shout." Grab the handler off the
    // scheduler and run it, but first advance the time so that the "angry"
    // shout gets scheduled next. We need to advance time up to the initial
    // "shout" time so that future shouts are scheduled correctly.
    await clock.tickAsync(moment.duration({ hours: 2 }).asMilliseconds());
    const calmShout = scheduleJob.mock.calls[0][1];
    await calmShout();

    expect(postMessage.mock.calls.length).toBe(0);
    expect(sendDirectMessage.mock.calls.length).toBe(2);

    expect(sendDirectMessage).toHaveBeenCalledWith("slack1", {
      username: "Disappointed Tock",
      icon_emoji: ":disappointed-tock:",
      text: ":disappointed-tock: Please <https://tock.18f.gov|Tock your time>!",
    });

    expect(sendDirectMessage).toHaveBeenCalledWith("slack2", {
      username: "Disappointed Tock",
      icon_emoji: ":disappointed-tock:",
      text: ":disappointed-tock: Please <https://tock.18f.gov|Tock your time>!",
    });

    // Reset stub history so we can be more sure about the next step.
    scheduleJob.mockClear();
    postMessage.mockClear();
    sendDirectMessage.mockClear();

    // After the calm "shout", there's a short delay and then an "angry" shout
    // should be scheduled. Advance time so the angry shout is scheduled
    // correctly, then grab that handler.
    clock.tick(10000);
    const angryShout = scheduleJob.mock.calls[0][1];
    await angryShout();

    expect(sendDirectMessage.mock.calls.length).toBe(2);

    expect(sendDirectMessage).toHaveBeenCalledWith("slack1", {
      username: "Angry Tock",
      icon_emoji: ":angrytock:",
      text: ":angrytock: <https://tock.18f.gov|Tock your time>! You gotta!",
    });

    expect(sendDirectMessage).toHaveBeenCalledWith("slack2", {
      username: "Angry Tock",
      icon_emoji: ":angrytock:",
      text: ":angrytock: <https://tock.18f.gov|Tock your time>! You gotta!",
    });

    expect(postMessage.mock.calls.length).toBe(2);

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
    };

    expect(postMessage).toHaveBeenCalledWith({
      ...reportMessage,
      channel: "#channel",
    });
    expect(postMessage).toHaveBeenCalledWith({
      ...reportMessage,
      channel: "@user",
    });

    // Clear everything out again, and make sure that the "angry" shout turns
    // very happy if there aren't any truants.
    postMessage.mockClear();
    sendDirectMessage.mockClear();

    get18FTockTruants.mockResolvedValue([]);
    await angryShout();

    const happyMessage = {
      username: "Happy Tock",
      icon_emoji: ":happy-tock:",
      text: "No Tock truants!",
    };

    expect(postMessage.mock.calls.length).toBe(3);
    expect(sendDirectMessage.mock.calls.length).toBe(0);

    expect(postMessage).toHaveBeenCalledWith({
      ...happyMessage,
      channel: "#channel",
    });
    expect(postMessage).toHaveBeenCalledWith({
      ...happyMessage,
      channel: "@user",
    });
    expect(postMessage).toHaveBeenCalledWith({
      ...happyMessage,
      channel: "#happy",
    });
  });
});
