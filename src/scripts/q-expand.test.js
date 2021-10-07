const { getApp } = require("../utils/test");
const script = require("./q-expand");

describe("q-expand", () => {
  const app = getApp();

  beforeEach(() => {
    app.brain.clear();
    jest.resetAllMocks();
  });

  it("registers a handler", () => {
    script(app);
    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /qex ([a-z]{1,6})/i,
      expect.any(Function)
    );
  });
});
