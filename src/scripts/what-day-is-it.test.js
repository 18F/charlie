const sinon = require("sinon");
const { getApp } = require("../utils/test");
const day = require("./what-day-is-it");

describe("the jokey March 2020 date thingy", () => {
  const app = getApp();
  let clock;

  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });

  afterAll(() => {
    clock.restore();
  });

  it("hooks up the right listener", () => {
    day(app);

    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /what day is it/i,
      expect.any(Function)
    );
  });

  it("tells you what day it is, in March 2020 terms", () => {
    const handler = app.getHandler();
    const say = jest.fn();

    clock.tick(Date.parse("2020-05-03T00:00:00Z"));

    handler({ say });

    expect(say).toHaveBeenCalledWith(
      expect.stringMatching(
        /Today is (Saturday|Blursday), (March|Evermarch) 63, 2020/
      )
    );
  });
});
