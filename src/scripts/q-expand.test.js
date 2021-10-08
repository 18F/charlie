const { getApp } = require("../utils/test");
const script = require("./q-expand");

describe("q-expand bot", () => {
  const app = getApp();

  beforeEach(() => {
    app.brain.clear();
    jest.resetAllMocks();
  });

  it("if the correct thing is sent, it parses out the acronym", () => {
    script(app);
    expect(app.message).toHaveBeenCalledWith(
      /^qex\s+([a-z]{1,6})$/i,
      expect.any(Function)
    );
  });
});

/*
I'm just lost from here down...

describe("csv data properly pulled into object", () => {
  const app = getApp();
  script(app);
  const csvData = script.getCsvData;
  console.log(csvData);
  expect(csvData["Q"]).toBe("TTS");
});
*/

/*
describe("handles q-expand requests", () => {
  it("for a known acronym"),
    () => {
      // XXX do the stuff
    };
});
*/
