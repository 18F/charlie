const { getApp } = require("../utils/test");
const bot = require("./federal-holidays");

describe("federal holidays bot", () => {
  const app = getApp();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("registers a responder for federal holidays", () => {
    bot(app);

    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /(when is( the)? )?next (federal )?holiday/i,
      expect.any(Function)
    );
  });

  it("responds to a request for the next federal holiday", () => {
    bot(app);
    const handler = app.getHandler();
    const say = jest.fn();

    handler({ say });

    expect(say.mock.calls.length).toBe(1);
    expect(say).toHaveBeenCalledWith(
      expect.stringMatching(/The next federal holiday is .+/)
    );
  });
});
