const sample = require("./sample");

describe("utils / sample", () => {
  const arr = ["a", "b", "c", "d", "e"];

  it("selects an item from an array based on randomValue", () => {
    expect(sample(arr, 0)).toEqual("a");
    expect(sample(arr, 0.999)).toEqual("e");
  });

  it("still returns a random item when randomValue is not provided", () => {
    expect(arr).toContain(sample(arr));
  });

  it("returns undefined when an array is empty", () => {
    expect(sample([])).toBeUndefined();
  });
});
