const { Client } = require("pg");

jest.mock("pg", () => ({
  Client: jest.fn(),
}));

const brain = require("./brain");

describe("the brain", () => {
  const connect = jest.fn();
  const query = jest.fn();

  Client.mockImplementation(() => ({ connect, query }));

  beforeEach(() => {
    connect.mockReset();
    query.mockReset();
  });

  it("initializes", async () => {
    query
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce({ rows: [{ key: "key", value: '"value"' }] });

    await brain.initialize();

    // One for creating the table, if necessary; one for reading existing data
    expect(query.mock.calls.length).toBe(2);
    expect(query.mock.calls[0][0]).toEqual(
      "CREATE TABLE IF NOT EXISTS brain (key TEXT PRIMARY KEY, value TEXT)"
    );
    expect(query).toHaveBeenCalledWith("SELECT * FROM brain");
    expect(brain.get("key")).toEqual("value");
  });

  it("gets values it knows about", () => {
    // This is set when the brain is initialized in the previous test.
    expect(brain.get("key")).toEqual("value");
  });

  it("gracefully handles values it doesn't know about", () => {
    expect(brain.get("value")).toEqual(undefined);
  });

  it("sets and saves values", () => {
    brain.set("new key", "new value");

    expect(brain.get("new key")).toEqual("new value");
    expect(query).toHaveBeenCalledWith(
      "INSERT INTO brain (key, value) VALUES($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2",
      ["new key", '"new value"']
    );
  });
});
