const CACHE_MAX_LIFE = 4 * 60 * 60 * 1000; // 4 hours

const cache = (() => {
  const privateCache = new Map();

  // Clear out anything over a maximum lifetime, regularly, to prevent memory
  // leaks. Otherwise caches of months-old Tock data could end up sticking
  // around forever and ever, amen.
  setInterval(() => {
    const expiry = Date.now();
    for (const [key, { timestamp }] of privateCache) {
      if (timestamp + CACHE_MAX_LIFE <= expiry) {
        privateCache.delete(key);
      }
    }
  }, CACHE_MAX_LIFE).unref();
  // Unref the timer, so that it won't keep the Node process alive. By default,
  // Node will keep a process alive as long as anything is waiting on the main
  // loop, but this interval timer shouldn't keep the process alive.

  const cacheFunction = async (key, lifetimeInMinutes, callback) => {
    const lifetimeInMS = lifetimeInMinutes * 60 * 1000;

    // If the key isn't in the cache, default to a timestamp of -Infinity so we
    // will always use the callback.
    const { timestamp, value } = privateCache.get(key) ?? {
      timestamp: -Infinity,
    };

    // The cached value is older than the allowed lifetime, so fetch it anew.
    if (timestamp + lifetimeInMS < Date.now()) {
      const newValue = await callback();

      privateCache.set(key, { timestamp: Date.now(), value: newValue });
      return newValue;
    }

    return value;
  };

  cacheFunction.clear = () => {
    privateCache.clear();
  };

  return cacheFunction;
})();

module.exports = { cache };
