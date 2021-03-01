const holidays = require("./holidays");

describe("holidays utilities", () => {
  it("maps holiday names to emoji strings", () => {
    const keys = Array.from(holidays.emojis.keys());
    const values = Array.from(holidays.emojis.values());

    // Just assert that all keys and values are strings. That's really all we
    // can do here. :shrugging-person-made-of-symbols:
    expect(keys.filter((key) => typeof key === "string")).toEqual(keys);
    expect(values.filter((value) => typeof value === "string")).toEqual(values);
  });
});
