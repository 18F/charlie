const { brain } = require("./test");

const optOutModule = jest.requireActual("./optOut");

describe("opt-out utility", () => {
  let optOut;

  beforeAll(() => {
    optOut = optOutModule("test");
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("initializes an opt-out object", () => {
    expect(optOut).toEqual({
      button: {
        accessory: {
          action_id: "opt_out",
          type: "overflow",
          options: [
            {
              text: {
                type: "plain_text",
                text: "Don't show me this anymore",
              },
              value: "test",
            },
          ],
        },
      },
      isOptedOut: expect.any(Function),
    });
  });

  it("returns true if the user ID is in the opt-out list", () => {
    brain.get.mockReturnValue({ test: ["user id"] });
    expect(optOut.isOptedOut("user id")).toEqual(true);
  });

  it("returns false if the user ID is not in the opt-out list", () => {
    brain.get.mockReturnValue({ test: ["different user id"] });
    expect(optOut.isOptedOut("user id")).toEqual(false);
  });
});
