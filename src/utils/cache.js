const CACHE_MAX_LIFE = 20 * 60 * 1000;

const cache = (() => {
  const privateCache = new Map();

  // Clear out anything over 20 minutes old, regularly, to prevent memory leaks.
  // Otherwise caches of months-old Tock data could end up sticking around
  // forever and ever, amen.
  setInterval(() => {
    // The for..of iterator on a Map has well-established, proper behavior, so
    // this eslint error is irrelevant here. It does rely on Symbols, but Node
    // has those.
    /* eslint-disable no-restricted-syntax */
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
    if (privateCache.has(key)) {
      const { timestamp, value } = privateCache.get(key);

      // The cached value is older than the allowed lifetime, so fetch it anew.
      if (timestamp + lifetimeInMinutes * 60 * 1000 < Date.now()) {
        const newValue = await callback();

        privateCache.set(key, { timestamp: Date.now(), value: newValue });
        return newValue;
      }

      return value;
    }

    const value = await callback();
    privateCache.set(key, { timestamp: Date.now(), value });
    return value;
  };

  cacheFunction.clear = () => {
    privateCache.clear();
  };

  return cacheFunction;
})();

module.exports = { cache };
