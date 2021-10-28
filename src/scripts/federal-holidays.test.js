const moment = require("moment-timezone");
const { getApp } = require("../utils/test");
const bot = require("./federal-holidays");
const {
  utils: {
    dates: { getNextHoliday },
  },
} = require("../utils/test");

describe("federal holidays bot", () => {
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

  it("registers a responder for federal holidays", () => {
    bot(app);

    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /(when is( the)? )?next (federal )?holiday/i,
      expect.any(Function)
    );
  });

  describe("responds to a request for the next federal holiday", () => {
    it("uses the official holiday name if there is not an alternate name", () => {
      bot(app);
      const handler = app.getHandler();
      const say = jest.fn();

      getNextHoliday.mockReturnValue({
        date: moment.tz("1970-01-02T00:00:00", "UTC"),
        name: "Test Holiday day",
      });

      handler({ say });

      expect(say.mock.calls.length).toBe(1);
      expect(say).toHaveBeenCalledWith(
        "The next federal holiday is Test Holiday day in 1 days on Friday, January 2nd"
      );
    });

    it("uses an alternate name, if provided", () => {
      bot(app);
      const handler = app.getHandler();
      const say = jest.fn();

      getNextHoliday.mockReturnValue({
        date: moment.tz("1970-01-02T00:00:00", "UTC"),
        name: "Test Holiday day",
        alsoObservedAs: "Other holiday day day day",
      });

      handler({ say });

      expect(say.mock.calls.length).toBe(1);
      expect(say).toHaveBeenCalledWith(
        "The next federal holiday is Other holiday day day day in 1 days on Friday, January 2nd"
      );
    });
  });

  it("includes an emoji for well-known holidays", () => {
    bot(app);
    const handler = app.getHandler();
    const say = jest.fn();

    getNextHoliday.mockReturnValue({
      date: moment.tz("1970-01-02T00:00:00", "UTC"),
      name: "Christmas Day",
    });

    handler({ say });

    expect(say.mock.calls.length).toBe(1);
    expect(say).toHaveBeenCalledWith(
      "The next federal holiday is Christmas Day :christmas_tree: in 1 days on Friday, January 2nd"
    );
  });
});
