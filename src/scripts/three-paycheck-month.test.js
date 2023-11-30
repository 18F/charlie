const { getApp } = require("../utils/test");
const bot = require("./three-paycheck-month");

describe("three-paycheck month bot tells you when the next three-paycheck month is", () => {
  const app = getApp();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.setSystemTime(0);
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("registers a handler at setup", () => {
    bot(app);

    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(RegExp),
      expect.any(Function),
    );
  });

  describe("responds with the next 3-paycheck month", () => {
    let handler;
    const say = jest.fn();

    const payload = { message: { thread_ts: "thread id" }, say };

    beforeEach(() => {
      bot(app);
      handler = app.getHandler();
    });

    describe("if the current month is a 3-paycheck month", () => {
      it("and the month starts on a Friday", () => {
        // Remember that Javascript months are 0-indexed, so 3 is actually April
        jest.setSystemTime(new Date(2022, 3, 1));
        handler(payload);

        expect(say).toHaveBeenCalledWith({
          text: "The next 3-paycheck month is April 2022.",
          thread_ts: "thread id",
        });
      });

      it("and the month does not start on a Friday", () => {
        // And 8 is actually September
        jest.setSystemTime(new Date(2022, 8, 12));
        handler(payload);

        expect(say).toHaveBeenCalledWith({
          text: "The next 3-paycheck month is September 2022.",
          thread_ts: "thread id",
        });
      });
    });

    describe("if the current month is not a 3-paycheck month", () => {
      it("but the first Friday is a paycheck", () => {
        jest.setSystemTime(new Date(2022, 2, 9));
        handler(payload);

        expect(say).toHaveBeenCalledWith({
          text: "The next 3-paycheck month is April 2022.",
          thread_ts: "thread id",
        });
      });

      it("and the first Friday is not a paycheck", () => {
        jest.setSystemTime(new Date(2022, 4, 9));
        handler(payload);

        expect(say).toHaveBeenCalledWith({
          text: "The next 3-paycheck month is September 2022.",
          thread_ts: "thread id",
        });
      });
    });

    it("if the next 3-paycheck month is in the next year", () => {
      jest.setSystemTime(new Date(2022, 10, 4));
      handler(payload);

      expect(say).toHaveBeenCalledWith({
        text: "The next 3-paycheck month is March 2023.",
        thread_ts: "thread id",
      });
    });
  });
});
