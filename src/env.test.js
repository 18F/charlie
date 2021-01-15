describe("environment configurator", () => {
  /* eslint-disable global-require */
  // Because the env.js module does all of its work at load-time, we need to
  // load it when it's time to execute the tests. And since we have more than
  // one test, we also need to unload and reload it. As a result, we don't have
  // our require() calls only at the top of the file.

  let config;

  beforeEach(() => {
    // Blow away the Node module cache so they'll reload when we require() them
    // again, rather than using their cached instances.
    jest.resetModules();

    // Mock the dotenv.config method. We don't actually want it to do anything,
    // just make sure that it's called.
    config = require("dotenv").config;
    jest.mock("dotenv", () => ({
      config: jest.fn(),
    }));

    // Also blank out the environment variables so we know what we've got.
    process.env = {};
  });

  it("configurates the environment without VCAP services", () => {
    require("./env");

    expect(config).toHaveBeenCalled();
  });

  it("configurates the environment if there are VCAP services but no charlie config", () => {
    process.env.VCAP_SERVICES = JSON.stringify({
      "user-provided": [
        { name: "ignore these", credentials: { ohno: "should not exist" } },
      ],
    });

    require("./env");

    expect(config).toHaveBeenCalled();
    expect(process.env.ohno).toBeUndefined();
  });

  it("configurates the environment with VCAP services", () => {
    process.env.VCAP_SERVICES = JSON.stringify({
      "user-provided": [
        { name: "ignore these", credentials: { ohno: "should not exist" } },
        { name: "charlie-config", credentials: { ohyay: "should exist" } },
      ],
    });

    require("./env");

    expect(config).toHaveBeenCalled();
    expect(process.env.ohno).toBeUndefined();
    expect(process.env.ohyay).toEqual("should exist");
  });
});
