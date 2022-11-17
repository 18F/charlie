describe("utils / cache", () => {
  let cache;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    // Completely reload the module for each test, so we're always starting with
    // an empty cache. Also, the module needs to be loaded after the timers have
    // been faked.
    jest.resetModules();
    jest.setSystemTime(0);
    cache = require("./cache").cache; // eslint-disable-line global-require
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  // Make this the first time-based test, otherwise we get into quirky issues
  // where the clock has ticked some and then stuff gets added to the cache
  // so that it doesn't expire on the next auto-clean. That is correct
  // behavior, but it's hard to account for. Having this test first moots it.
  it("clears itself of things that are more than 4 hours old", async () => {
    const FOUR_HOURS = 4 * 60 * 60 * 1000;

    const callback = jest.fn().mockResolvedValue("");

    // Put something into the cache
    await cache("key", 30, callback);

    // Reset the callback history so we'll know if it's been called again
    // later.
    callback.mockClear();

    // Call from the cache to prove that the callback isn't called.
    await cache("key", 300, callback);
    expect(callback).not.toHaveBeenCalled();

    // Zoom to the future!
    await jest.advanceTimersByTime(FOUR_HOURS);

    await cache("key", 300, callback);
    expect(callback).toHaveBeenCalled();
  });

  it("stores cached results for the specified time", async () => {
    const lifetimeInMinutes = 3;
    const callback = jest.fn().mockResolvedValue("first call");

    const result1 = await cache("test key", lifetimeInMinutes, callback);
    expect(result1).toEqual("first call");

    // Change the behavior of the callback. It shouldn't get called again, but
    // if it does, we want the test to fail.
    callback.mockResolvedValue("second call");

    const result2 = await cache("test key", lifetimeInMinutes, callback);
    expect(result2).toEqual(result1);

    // Tick forward. We need to go one tick past the lifetime in case the
    // comparison is strictly less than instead of less than or equal.
    jest.advanceTimersByTime(lifetimeInMinutes * 60 * 1000 + 1);

    // Now we should get a new call to the callback.
    const result3 = await cache("test key", lifetimeInMinutes, callback);
    expect(result3).toEqual("second call");
  });

  it("can empty the cache", async () => {
    const lifetimeInMinutes = 3;
    const callback = jest.fn().mockResolvedValue("first call");

    const result1 = await cache("test key", lifetimeInMinutes, callback);
    expect(result1).toEqual("first call");

    // Change the behavior of the callback, then clear the cache. If this
    // clear fails, then the test should fail.
    callback.mockResolvedValue("second call");
    cache.clear();

    const result2 = await cache("test key", lifetimeInMinutes, callback);
    expect(result2).toEqual("second call");
  });
});
