const utils = require("./index");

describe("utils / index", () => {
  it("exports things", () => {
    expect(Object.keys(utils)).toEqual([
      "cache",
      "dates",
      "helpMessage",
      "holidays",
      "homepage",
      "optOut",
      "slack",
      "stats",
      "tock",
    ]);
  });
});
