let stubbedRandom = undefined;

/**
 * Returns a randomly-selected item from an array
 * @template T
 * @param {T[]} arr Array of values to be sampled
 * @return {T=} an item from the array (or undefined if empty array)
 */
function sample(arr) {
  const randomValue = stubbedRandom ?? Math.random();
  return arr[Math.floor(randomValue * arr.length)];
}

/**
 * Note: should only be used in tests!
 * @param {number} value value to use instead of random
 */
sample.stubRandom = (value) => {
  stubbedRandom = value;
};

sample.removeStub = () => {
  stubbedRandom = undefined;
};

module.exports = sample;
