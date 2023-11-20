const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

describe("ERG inviter config file", () => {
  expect.extend({
    isValidErgDefinition: (erg, index) => {
      let pass = true;
      let message = "";

      if (typeof erg !== "object") {
        message = `Item ${index} is not an object`;
        pass = false;
      } else if (!erg.description || typeof erg.description !== "string") {
        message = `Description of ERG ${index} is a ${typeof erg.description}, but should be a string`;
        pass = false;
      } else if (!erg.channel || typeof erg.channel !== "string") {
        message = `Channel of ERG ${index} is a ${typeof erg.channel}, but should be a stirng`;
        pass = false;
      } else if (!erg.channel.startsWith("#")) {
        message = `Channel of ERG ${index} does not start with a # symbol`;
        pass = false;
      }

      return {
        message: () => message,
        pass,
      };
    },
  });

  const ymlStr = fs.readFileSync(
    path.join(
      path.dirname(require.resolve("./erg-inviter")),
      "erg-inviter.yaml",
    ),
  );
  const yml = yaml.load(ymlStr, { json: true });

  it("starts with a top-level ergs property", () => {
    expect(Object.keys(yml).length).toEqual(1);
    expect(typeof yml.ergs).toEqual("object");
  });

  it("each item is a valid ERG object", () => {
    const { ergs } = yml;
    Object.values(ergs).forEach((erg, i) => {
      expect(erg).isValidErgDefinition(i);
    });
  });
});
