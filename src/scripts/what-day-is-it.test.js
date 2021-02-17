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

    clock.tick(Date.parse("2021-01-23T12:00:00Z"));

    handler({ say });

    expect(say).toHaveBeenCalledWith(
      "Today is Saturday, January 23rd, 2021. It has been 4 days since March 2020."
    );
  });
});
