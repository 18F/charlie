const moment = require("moment-timezone");
const {
  utils: {
    dates: { getNextElectionDay },
    helpMessage,
    homepage: { registerDidYouKnow },
    slack: { postMessage },
  },
} = require("../utils/test");

describe("Election Day reminder bot", () => {
  const scheduleJob = jest.fn();
  jest.doMock("node-schedule", () => ({ scheduleJob }));

  // Load this module *after* everything gets mocked. Otherwise the module will
  // load the unmocked stuff and the tests won't work.
  // eslint-disable-next-line global-require
  const bot = require("./i-voted");

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.setSystemTime(0);
    jest.resetAllMocks();

    // The initialization relies on the next Election Day date, so we'll just
    // go ahead and mock one in for now.
    getNextElectionDay.mockReturnValue(moment.utc("1973-04-04", "YYYY-MM-DD"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("registers a help message", () => {
    it("defaults to #general-talk", () => {
      bot();

      expect(helpMessage.registerNonInteractive).toHaveBeenCalledWith(
        "Election Day",
        expect.stringMatching(/#general-talk/)
      );
    });

    it("or uses a configured channel", () => {
      bot(null, { VOTING_REMINDER_CHANNEL: "bob" });

      expect(helpMessage.registerNonInteractive).toHaveBeenCalledWith(
        "Election Day",
        expect.stringMatching(/#bob/)
      );
    });
  });

  describe("registers a did-you-know message", () => {
    it("registers the callback", () => {
      bot();
      expect(registerDidYouKnow).toHaveBeenCalledWith(expect.any(Function));
    });

    it("the callback returns the expected message", () => {
      bot();
      const callback = registerDidYouKnow.mock.calls[0][0];

      const message = callback();

      expect(message).toEqual({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "The next federal :vote-gov: Election Day is April 4th, 1973",
        },
      });
    });
  });

  describe("schedules a reminder message", () => {
    it("defaults to 10:00 am eastern time", () => {
      bot();

      expect(scheduleJob).toHaveBeenCalledWith(
        moment.tz("1973-04-04T10:00:00", "America/New_York").toDate(),
        expect.any(Function)
      );
    });

    it("honors a configured reporting time", () => {
      bot(null, { VOTING_REMINDER_TIME: "16:00" });

      expect(scheduleJob).toHaveBeenCalledWith(
        moment.tz("1973-04-04T16:00:00", "America/New_York").toDate(),
        expect.any(Function)
      );
    });

    it("posts a message as its callback", () => {
      bot(null);

      const callback = scheduleJob.mock.calls[0][1];
      callback();

      expect(postMessage).toHaveBeenCalledWith({
        channel: "general-talk",
        text: "It's :vote-gov: Election Day! Want to celebrate voting, the cornerstone of democracy? Drop by #i-voted, tell us about your voting experience, and share pictures of your stickers! Is your sticker even better than :justice-schooner: Justice Schooner? Let's see it!",
      });
    });

    it("schedules the next reminder as part of the callback", () => {
      bot(null, { VOTING_REMINDER_TIME: "16:00" });

      const callback = scheduleJob.mock.calls[0][1];

      jest.resetAllMocks();
      callback();

      getNextElectionDay.mockReturnValue(
        moment.utc("1988-11-09", "YYYY-MM-DD")
      );

      jest.runAllTimers();

      expect(scheduleJob).toHaveBeenCalledWith(
        moment.tz("1988-11-09T10:00:00", "America/New_York").toDate(),
        expect.any(Function)
      );
    });
  });
});
