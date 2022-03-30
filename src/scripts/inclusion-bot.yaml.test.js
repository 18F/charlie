const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

describe("Inclusion bot config file", () => {
  expect.extend({
    isArrayOfStrings: (array, triggerIndex, type) => {
      const badIndex = array.findIndex((v) => typeof v !== "string");
      if (badIndex >= 0) {
        return {
          message: () =>
            `item ${triggerIndex}, ${type} ${badIndex} is a ${typeof array[
              badIndex
            ]}, but should be a string`,
          pass: false,
        };
      }

      return { message: () => {}, pass: true };
    },

    isString: (value, index) => {
      if (typeof value !== "string") {
        return {
          message: () =>
            `item ${index} is a ${typeof value}, but should be a string`,
          pass: false,
        };
      }

      return { message: () => {}, pass: true };
    },

    isValidResource: (resource, index) => {
      if (typeof resource !== "object") {
        return {
          message: () =>
            `resource ${index} is a ${typeof resource}, but should be an object`,
          pass: false,
        };
      }

      if (typeof resource.name !== "string") {
        return {
          message: () => `resource ${index} name must be a string`,
          pass: false,
        };
      }
      if (typeof resource.url !== "string") {
        return {
          message: () => `resource ${index} url must be a string`,
          pass: false,
        };
      }

      return { message: () => {}, pass: true };
    },

    isValidTrigger: (trigger, index) => {
      if (typeof trigger !== "object") {
        return {
          message: () =>
            `item ${index} is a ${typeof trigger}, but should be an object`,
          pass: false,
        };
      }

      const keys = Object.keys(trigger);

      if (keys.indexOf("matches") < 0) {
        return {
          message: () => `item ${index} does not have matches`,
          pass: false,
        };
      }

      if (!Array.isArray(trigger.matches)) {
        return {
          message: () => `item ${index} matches is not an array`,
          pass: false,
        };
      }

      if (keys.indexOf("alternatives") < 0) {
        return {
          message: () => `item ${index} does not have alternatives`,
          pass: false,
        };
      }

      if (!Array.isArray(trigger.alternatives)) {
        return {
          message: () => `item ${index} alternatives is not an array`,
          pass: false,
        };
      }

      if (keys.indexOf("ignore") >= 0 && !Array.isArray(trigger.ignore)) {
        return {
          message: () => `item ${index} ignore is not an array`,
          pass: false,
        };
      }

      if (keys.indexOf("why") >= 0 && typeof trigger.why !== "string") {
        return {
          message: () => `item ${index} why is not a string`,
          pass: false,
        };
      }

      const validKeys = [
        "matches",
        "alternatives",
        "ignore",
        "why",
        "group",
        "more",
      ];
      const invalidKeys = keys.filter((key) => !validKeys.includes(key));

      if (invalidKeys.length > 0) {
        return {
          message: () =>
            `item ${index} has invalid keys: ${invalidKeys.join(", ")}`,
          pass: false,
        };
      }

      return {
        message: () => {},
        pass: true,
      };
    },
  });

  const ymlStr = fs.readFileSync(
    path.join(
      path.dirname(require.resolve("./inclusion-bot")),
      "inclusion-bot.yaml"
    )
  );
  const yml = yaml.load(ymlStr, { json: true });

  it("starts with a top-level triggers property", () => {
    expect(Object.keys(yml).length).toEqual(4);
    expect(typeof yml.link).toEqual("string");
    expect(typeof yml.message).toEqual("string");
    expect(Array.isArray(yml.triggers)).toEqual(true);
    expect(typeof yml.resources).toEqual("object");
  });

  it("each resource has a name and URL", () => {
    const resources = Object.values(yml.resources);

    resources.forEach((resource, i) => {
      expect(resource).isValidResource(i);
    });
  });

  it("each item is an object, and each property of each object is a string", () => {
    const { triggers } = yml;
    triggers.forEach((trigger, i) => {
      expect(trigger).isValidTrigger(i);
      expect(trigger.matches).isArrayOfStrings(i, "matches");
      expect(trigger.alternatives).isArrayOfStrings(i, "alternatives");

      if (trigger.ignore) {
        expect(trigger.ignore).isArrayOfStrings(i, "ignores");
      }

      if (trigger.why) {
        expect(trigger.why).isString(i);
      }
    });
  });
});
