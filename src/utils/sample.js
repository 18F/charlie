/**
 * Returns a randomly-selected item from an array
 * @param {any[]} arr Array of values to be sampled
 * @param {Number} [randomValue] random value that can be injected for more deterministic behavior
 */
function sample(arr, randomValue = Math.random()) {
  return arr[Math.floor(randomValue * arr.length)];
}

module.exports = sample;
