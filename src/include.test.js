/* eslint-disable global-require,import/no-dynamic-require */

const fs = require("fs").promises;
const path = require("path");

describe("pull in everything, so we get good coverage", () => {
  it(`will always pass, but that's okay`, async () => {
    require("./brain");
    require("./env");

    const dirs = ["scripts", "utils"];

    await Promise.all(
      dirs.map(async (dir) => {
        const allFiles = await fs.readdir(path.join(__dirname, dir));
        const sourceFiles = allFiles.filter(
          (f) => f.endsWith(".js") && !f.endsWith(".test.js")
        );
        sourceFiles.forEach((f) => {
          require(`./${dir}/${f}`);
        });
      })
    );
  });
});
