describe("help message registrar and reporter", () => {
  const load = () =>
    new Promise((resolve) => {
      jest.isolateModules(() => {
        const module = require("./helpMessage"); // eslint-disable-line global-require
        resolve(module);
      });
    });

  let helpMessage;

  beforeEach(async () => {
    helpMessage = await load();
  });

  describe("lets me register interactive bots", () => {
    it("assumes a direct mention is not required", () => {
      helpMessage.registerInteractive("bot", "trigger", "help text");

      expect(helpMessage.getHelp().has(helpMessage.type.interactive)).toBe(
        true,
      );
      expect(helpMessage.getHelp().get(helpMessage.type.interactive)).toEqual([
        {
          name: "bot",
          trigger: "trigger",
          helpText: "help text",
          directMention: false,
        },
      ]);
    });

    it("accepts the direct mention flag as an argument", () => {
      helpMessage.registerInteractive("bot", "trigger", "help text", true);

      expect(helpMessage.getHelp().has(helpMessage.type.interactive)).toBe(
        true,
      );
      expect(helpMessage.getHelp().get(helpMessage.type.interactive)).toEqual([
        {
          name: "bot",
          trigger: "trigger",
          helpText: "help text",
          directMention: true,
        },
      ]);
    });
  });

  it("lets me register noninteractive bots", () => {
    helpMessage.registerNonInteractive("bot", "help text");

    expect(helpMessage.getHelp().has(helpMessage.type.noninteractive)).toBe(
      true,
    );
    expect(helpMessage.getHelp().get(helpMessage.type.noninteractive)).toEqual([
      {
        name: "bot",
        helpText: "help text",
      },
    ]);
  });
});
