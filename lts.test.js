const fs = require("fs/promises");
const lts = require("./lts");

jest.mock("fs/promises");

const {
  main,
  getCurrentLTSVersion,
  getPackageNodeVersion,
  getDockerNodeVersion,
  getWorkflowLinesWithInvalidNodeVersion,
} = lts;

describe("Charlie's Node.js LTS checker", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("gets the current LTS version", () => {
    const REAL_FETCH = global.fetch;

    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(Date.parse("2022-10-31"));

      global.fetch = jest.fn("fetch");
    });

    afterAll(() => {
      global.fetch = REAL_FETCH;
      jest.useRealTimers();
    });

    it("from the Node.js roadmap", async () => {
      global.fetch.mockImplementation(async () => ({
        json: async () => ({
          // Throw in a higher version with no LTS, to test that it gets ignored
          v22: {},
          // Put the versions out of order to test that we get the highest one
          // regardless of order or actual LTS date. (There's no good reason a
          // higher version should ever have an earlier date, so the code just
          // assumes it'll never be that way. We can accept that assumption.)
          v20: {
            lts: "2020-02-02",
          },
          v19: {
            lts: "2021-02-02",
          },
          // And one version that has an LTS in the future (based on our faked
          // timers above) to test that it also gets filtered out.
          v23: {
            lts: "2024-04-04",
          },
        }),
      }));

      const version = await getCurrentLTSVersion();

      expect(version).toEqual(20);
      expect(global.fetch.mock.calls[0][0]).toEqual(
        "https://raw.githubusercontent.com/nodejs/Release/main/schedule.json"
      );
    });
  });

  describe("gets the package Node version", () => {
    it("from package.json", async () => {
      fs.readFile.mockResolvedValue(
        JSON.stringify({
          engines: { node: "^1527.54.2" },
        })
      );

      const version = await getPackageNodeVersion();
      expect(version).toEqual(1527);
      expect(fs.readFile).toHaveBeenCalledWith("./package.json");
    });

    it("with an invalid version if the package doesn't specify a version", async () => {
      fs.readFile.mockResolvedValue("{}");

      const version = await getPackageNodeVersion();
      expect(version).toEqual("not set");
    });
  });

  describe("gets the Node version used for Docker", () => {
    it("from Dockerfile", async () => {
      fs.readFile.mockResolvedValue(`# This is a comment
# make sure it gets handled
FROM node:16

more stuff to ignore`);

      const version = await getDockerNodeVersion();

      expect(version).toEqual(16);
      expect(fs.readFile).toHaveBeenCalledWith(
        "Dockerfile",
        expect.any(Object)
      );
    });

    it("with an invalid version if the Docker image isn't based on Node", async () => {
      fs.readFile.mockResolvedValue(`FROM ruby:3`);

      const version = await getDockerNodeVersion();

      expect(version).toEqual("not set");
    });
  });

  describe("scans GitHub workflow files for Node.js versions", () => {
    it("only checks yaml files in the workflows directory", async () => {
      fs.readdir.mockResolvedValue(["a.txt", "b.yml", "c.yml", "d.js", "."]);
      fs.readFile.mockResolvedValue("");

      await getWorkflowLinesWithInvalidNodeVersion();

      const enc = { encoding: "utf-8" };

      expect(fs.readFile).toHaveBeenCalledWith(".github/workflows/b.yml", enc);
      expect(fs.readFile).toHaveBeenCalledWith(".github/workflows/c.yml", enc);
      expect(fs.readFile.mock.calls.length).toEqual(2);
    });

    describe("it checks the yaml files it finds", () => {
      beforeEach(() => {
        fs.readdir.mockResolvedValue(["a.yml"]);
      });

      it("ignores references to the word 'container' that are not a yaml key", async () => {
        fs.readFile.mockResolvedValue(`
          line 1
          line 2
          bob: container: node:18
          line 4`);

        const output = await getWorkflowLinesWithInvalidNodeVersion(16);

        // Identifies line 3 as the problem, referencing version 18
        expect(output).toEqual([]);
      });

      it("finds containers built from non-matching Node versions", async () => {
        fs.readFile.mockResolvedValue(`line 1
          line 2
          container: node:18
          line 4
          container: node:16`);

        const output = await getWorkflowLinesWithInvalidNodeVersion(16);

        // Identifies line 3 as the problem, referencing version 18; but does
        // not identify line 5, which uses the expected version 16
        expect(output).toEqual([[".github/workflows/a.yml", [[3, 18]]]]);
      });

      it("finds Node versions configured for the setup-node action", async () => {
        fs.readFile.mockResolvedValue(
          [
            "  line 1",
            "  line 2",
            // Test a block where the "uses" and "with" properties are at the
            // same depth (e.g., maybe the first property of the block was the
            // step name instead of the uses key)
            "  uses: actions/setup-node@bob",
            "  with:",
            "    node-version: 14",

            // Test a block where the "uses" property is the first one in the
            // block.
            "  - uses: actions/setup-node",
            "    with:",
            "      node-version: 18",

            // Test a block with the expected Node version, to make sure it
            // doesn't show up in the list
            "  - uses: actions/setup-node",
            "    node-version: 16",

            // Test a uses block that does not have a node-version but is
            // followed by a node-version that is not part of the block.
            "  - uses: actions/setup-node",
            "  - node-version: 22",

            // Similar to above
            "  - uses: actions/setup-node",
            "  - something-else",
            "    node-version: 88",
          ].join("\n")
        );

        const output = await getWorkflowLinesWithInvalidNodeVersion(16);

        expect(output).toEqual([
          [
            ".github/workflows/a.yml",
            [
              [5, 14],
              [8, 18],
              [11, "not set"],
              [13, "not set"],
            ],
          ],
        ]);
      });
    });
  });

  describe("stringing everything together", () => {
    beforeEach(() => {
      lts.getCurrentLTSVersion = jest.fn();
      lts.getDockerNodeVersion = jest.fn();
      lts.getPackageNodeVersion = jest.fn();
      lts.getWorkflowLinesWithInvalidNodeVersion = jest.fn();
    });

    afterAll(() => {
      lts.getCurrentLTSVersion = getCurrentLTSVersion;
      lts.getDockerNodeVersion = getDockerNodeVersion;
      lts.getPackageNodeVersion = getPackageNodeVersion;
      lts.getWorkflowLinesWithInvalidNodeVersion =
        getWorkflowLinesWithInvalidNodeVersion;
    });

    it("returns an empty list if there aren't any errors", async () => {
      lts.getCurrentLTSVersion.mockResolvedValue(16);
      lts.getDockerNodeVersion.mockResolvedValue(16);
      lts.getPackageNodeVersion.mockResolvedValue(16);
      lts.getWorkflowLinesWithInvalidNodeVersion.mockResolvedValue([]);

      const errors = await main();
      expect(errors).toEqual([]);
    });

    it("tells us about the errors it finds", async () => {
      lts.getCurrentLTSVersion.mockResolvedValue(16);
      lts.getDockerNodeVersion.mockResolvedValue(14);
      lts.getPackageNodeVersion.mockResolvedValue(12);
      lts.getWorkflowLinesWithInvalidNodeVersion.mockResolvedValue([
        [
          "file 1",
          [
            [1, 12],
            [17, 18],
          ],
        ],
        [
          "file 2",
          [
            [9, 22],
            [14, 14],
          ],
        ],
      ]);

      const errors = await main();

      expect(errors).toEqual([
        "package.json is out of date",
        "  found Node 12; wanted 16",
        "Dockerfile is out of date",
        "  found Node 14; wanted 16",
        "Workflow file file 1 is out of date",
        "  line 1 uses Node 12; wanted 16",
        "  line 17 uses Node 18; wanted 16",
        "Workflow file file 2 is out of date",
        "  line 9 uses Node 22; wanted 16",
        "  line 14 uses Node 14; wanted 16",
      ]);
    });
  });
});
