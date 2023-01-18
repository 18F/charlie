const moment = require("moment-timezone");
const {
  getApp,
  utils: {
    dates: { getCurrentWorkWeek },
    tock: { get18FUsersWhoHaveNotTocked },
    slack: { postMessage },
  },
} = require("../utils/test");

describe("Tock truancy reporter for ops", () => {
  const app = getApp();

  const scheduleJob = jest.fn();
  jest.doMock("node-schedule", () => ({ scheduleJob }));

  // Load this module *after* everything gets mocked. Otherwise the module will
  // load the unmocked stuff and the tests won't work.
  // eslint-disable-next-line global-require
  const script = require("./tock-ops-report");

  beforeEach(() => {
    jest.resetAllMocks();
    postMessage.mockResolvedValue(null);
  });

  describe("initialization", () => {
    describe("does not register itself", () => {
      it("if TOCK_API and TOCK_TOKEN are unset", () => {
        script(app);
        expect(app.logger.warn).toHaveBeenCalled();
        expect(scheduleJob).not.toHaveBeenCalled();
      });

      it("if only TOCK_API is unset", () => {
        script(app, { TOCK_TOKEN: "token" });
        expect(app.logger.warn).toHaveBeenCalled();
        expect(scheduleJob).not.toHaveBeenCalled();
      });

      it("if only TOCK_TOKEN is unset", () => {
        script(app, { TOCK_API: "api" });
        expect(app.logger.warn).toHaveBeenCalled();
        expect(scheduleJob).not.toHaveBeenCalled();
      });
    });

    describe("registers itself", () => {
      it("if TOCK_API and TOCK_TOKEN are both set", () => {
        getCurrentWorkWeek.mockReturnValue([new Date()]);
        script(app, { TOCK_API: "api", TOCK_TOKEN: "token" });
        expect(app.logger.warn).not.toHaveBeenCalled();
        expect(scheduleJob).toHaveBeenCalled();
      });
    });
  });

  describe("schedules future reports", () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    describe("using configurated values", () => {
      const NOW = moment.tz("2022-11-14T12:00:00", "America/New_York").toDate();
      beforeEach(() => {
        jest.setSystemTime(NOW);
      });

      it("honors ANGRY_TOCK_TIMEZONE", () => {
        getCurrentWorkWeek.mockReturnValue([NOW]);

        script(app, {
          TOCK_API: true,
          TOCK_TOKEN: true,
          ANGRY_TOCK_TIMEZONE: "America/Los_Angeles",
        });

        const expected = moment.tz(
          "2022-11-14T16:00:00",
          "America/Los_Angeles"
        );

        expect(scheduleJob).toHaveBeenCalledWith(
          expected.toDate(),
          expect.any(Function)
        );
      });

      it("honors ANGRY_TOCK_SECOND_TIME", () => {
        getCurrentWorkWeek.mockReturnValue([NOW]);

        script(app, {
          TOCK_API: true,
          TOCK_TOKEN: true,
          ANGRY_TOCK_SECOND_TIME: "13:47",
        });

        const expected = moment.tz("2022-11-14T13:47:00", "America/New_York");

        expect(scheduleJob).toHaveBeenCalledWith(
          expected.toDate(),
          expect.any(Function)
        );
      });

      it("honors ANGRY_TOCK_REPORT_TO", async () => {
        getCurrentWorkWeek.mockReturnValue([NOW]);
        get18FUsersWhoHaveNotTocked.mockReturnValue([{ username: "hi" }]);

        script(app, {
          TOCK_API: true,
          TOCK_TOKEN: true,
          ANGRY_TOCK_REPORT_TO: "#test-channel,other-one",
        });

        const fn = scheduleJob.mock.calls[0][1];
        await fn();

        expect(postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ channel: "#test-channel" })
        );
        expect(postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ channel: "other-one" })
        );
      });

      describe("or defaults if unconfigured", () => {
        it("uses a default if ANGRY_TOCK_TIMEZONE is not set", () => {
          getCurrentWorkWeek.mockReturnValue([NOW]);

          script(app, {
            TOCK_API: true,
            TOCK_TOKEN: true,
            ANGRY_TOCK_SECOND_TIME: "13:00",
          });

          const expected = moment.tz("2022-11-14T13:00:00", "America/New_York");

          expect(scheduleJob).toHaveBeenCalledWith(
            expected.toDate(),
            expect.any(Function)
          );
        });

        it("uses a default if honors ANGRY_TOCK_SECOND_TIME is not set", () => {
          getCurrentWorkWeek.mockReturnValue([NOW]);

          script(app, {
            TOCK_API: true,
            TOCK_TOKEN: true,
            ANGRY_TOCK_TIMEZONE: "America/Los_Angeles",
          });

          const expected = moment.tz(
            "2022-11-14T16:00:00",
            "America/Los_Angeles"
          );

          expect(scheduleJob).toHaveBeenCalledWith(
            expected.toDate(),
            expect.any(Function)
          );
        });

        it("uses a default if honors ANGRY_TOCK_REPORT_TO is not set", async () => {
          getCurrentWorkWeek.mockReturnValue([NOW]);
          get18FUsersWhoHaveNotTocked.mockReturnValue([{ username: "hi" }]);

          script(app, {
            TOCK_API: true,
            TOCK_TOKEN: true,
          });

          const fn = scheduleJob.mock.calls[0][1];
          await fn();

          expect(postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ channel: "#18f-supes" })
          );
        });
      });
    });

    describe("the report scheduler", () => {
      const CONFIG = { TOCK_API: "api", TOCK_TOKEN: "token" };

      describe("if the current time is before the next reporting time", () => {
        it("schedules a report for later today", () => {
          const NOW = moment
            .tz("2022-11-14T12:00:00", "America/New_York")
            .toDate();
          getCurrentWorkWeek.mockReturnValue([NOW]);

          script(app, CONFIG);

          const expected = moment.tz("2022-11-14T16:00:00", "America/New_York");

          expect(scheduleJob).toHaveBeenCalledWith(
            expected.toDate(),
            expect.any(Function)
          );
        });
      });

      describe("if the current time is after the next reporting time", () => {
        describe("and the next Monday is not a holiday", () => {
          it("schedules a report for the expected time", () => {
            const NOW = moment.tz("2022-11-14T12:00:00", "America/New_York");
            getCurrentWorkWeek.mockReturnValue([NOW.toDate()]);

            jest.setSystemTime(NOW.add(2, "days").toDate());

            script(app, CONFIG);

            const expected = moment.tz(
              "2022-11-21T16:00:00",
              "America/New_York"
            );

            expect(scheduleJob).toHaveBeenCalledWith(
              expected.toDate(),
              expect.any(Function)
            );
          });
        });
        describe("and the next Monday is a holiday", () => {
          it("schedules a report for the expected time", () => {
            const NOW = moment.tz("2022-10-03T12:00:00", "America/New_York");
            getCurrentWorkWeek.mockReturnValue([NOW.toDate()]);

            jest.setSystemTime(NOW.add(2, "days").toDate());

            script(app, CONFIG);

            const expected = moment.tz(
              "2022-10-11T16:00:00",
              "America/New_York"
            );

            expect(scheduleJob).toHaveBeenCalledWith(
              expected.toDate(),
              expect.any(Function)
            );
          });
        });
      });
    });
  });

  describe("sends reports", () => {
    let reportFn;

    beforeAll(() => {
      getCurrentWorkWeek.mockReturnValue([new Date()]);
      script(app, { TOCK_API: "api", TOCK_TOKEN: "token" });
      reportFn = scheduleJob.mock.calls[0][1];
    });

    describe("when all users have Tocked", () => {
      beforeEach(() => {
        get18FUsersWhoHaveNotTocked.mockResolvedValue([]);
      });

      it("does not send a report", async () => {
        await reportFn();

        expect(postMessage).not.toHaveBeenCalled();
      });
    });

    describe("when some users have not Tocked", () => {
      beforeEach(() => {
        get18FUsersWhoHaveNotTocked.mockResolvedValue([
          { username: "alice" },
          { username: "bob" },
        ]);
      });

      it("does not send a report", async () => {
        await reportFn();

        expect(postMessage).toHaveBeenCalledWith({
          attachments: [
            {
              color: "#FF0000",
              fallback: "• alice\n• bob",
              text: "• alice\n• bob",
            },
          ],
          channel: "#18f-supes",
          icon_emoji: ":angrytock:",
          text: "*The following users have not yet reported their time on Tock:*",
          username: "Angry Tock",
        });
      });
    });
  });
});
