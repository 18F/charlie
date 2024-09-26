const sample = require("./sample");

describe("utils / sample", () => {
  const arr = ["a", "b", "c", "d", "e"];

  afterEach(() => {
    sample.removeStub();
  })

  it("returns a random item from the array", () => {
    expect(arr).toContain(sample(arr));
  });

  it("can be stubbed to return a specific value", () => {
    sample.stubRandom(0);
    expect(sample(arr)).toEqual("a");

    sample.stubRandom(0.999)
    expect(sample(arr)).toEqual("e");
  });

  it("returns undefined when an array is empty", () => {
    expect(sample([])).toBeUndefined();
  });
});
