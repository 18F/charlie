/**
 * Returns a randomly-selected item from an array
 * @template T
 * @param {T[]} arr Array of values to be sampled
 * @param {Number} [randomValue] random value that can be injected for more deterministic behavior
 * @return {T=} an item from the array (or undefined if empty array)
 */
function sample(arr, randomValue = Math.random()) {
  return arr[Math.floor(randomValue * arr.length)];
}

module.exports = sample;
