const fs = require("fs/promises");
const path = require("path");

const getCurrentLTSVersion = async () => {
  const LTS_SCHEDULE_URL =
    "https://raw.githubusercontent.com/nodejs/Release/main/schedule.json";

  // The collection of Node versions is given to us as a map. The keys of the
  // map are the major Node.js versions, and the objects are some metadata about
  // when the version was first released, when it will become LTS (if ever),
  // when it will enter maintenance mode, and when it will exit maintenance
  // mode. All we really need to know is the current LTS major version, so we
  // need to do some work on this collection.
  const nodeVersionMap = await fetch(LTS_SCHEDULE_URL).then((r) => r.json());

  const pastAndPresetLTSVersions = Object.entries(nodeVersionMap)
    // First get rid of Node.js versions that are not or will never be LTS, as
    // well as versions that will be LTS in the future. If they aren't LTS now,
    // we don't want the project to use them.
    .filter(([, { lts }]) => !!lts && new Date(lts).getTime() < Date.now())
    // Next map each key/value pair into just the numeric version number because
    // that's all we need after filtering down to only current and past LTSes.
    // The versions are formatted as "vXX" where "XX" is the actual number, so
    // we also need to slice off the "v" at the start.
    .map(([version]) => Number.parseInt(version.slice(1), 10));

  // Return the largest major version that is a past-or-present LTS. That is the
  // current LTS.
  return Math.max(...pastAndPresetLTSVersions);
};

const getPackageNodeVersion = async () => {
  const pkg = JSON.parse(await fs.readFile("./package.json"));

  if (pkg.engines.node) {
    // The engine property should be in semver format, so the major version will
    // be before the first dot.
    const [engineMajor] = pkg.engines.node.split(".");

    // The semver format may also include modifiers like ^ or ~ at the beginning,
    // so strip out anything from the major version that isn't a number and then
    // parse it into a number.
    return Number.parseInt(engineMajor.replace(/\D/g, ""), 10);
  }
  return "not set";
};

const getDockerNodeVersion = async () => {
  const dockerfile = await fs.readFile("Dockerfile", { encoding: "utf-8" });

  // The base container is specified on the first line of the Dockerfile that is
  // not a comment.
  const baseContainer = dockerfile
    .split("\n")
    .find((line) => !line.trim().startsWith("#"));

  // If the base container is Node, then we can pull out the version from it.
  if (baseContainer.startsWith("FROM node:")) {
    return Number.parseInt(baseContainer.replace("FROM node:", ""), 10);
  }

  // Otherwise, it's not a Node container at all. For Charlie, that is certainly
  // incorrect, so return a Node version that will cause the test to fail.
  return "not set";
};

const getWorkflowLinesWithInvalidNodeVersion = async (currentLTSVersion) => {
  // First, get a list of all the YAML files in the workflows directory
  const workflowPath = ".github/workflows";
  const ymlPaths = (await fs.readdir(workflowPath))
    .filter((f) => f.endsWith(".yml"))
    // And smoosh the filenames together with the path
    .map((f) => path.join(workflowPath, f));

  // Capture which workflow files have invalid Node references
  const workflowFileWithInvalidNodeReferences = [];

  for await (const ymlFilePath of ymlPaths) {
    // Read the workflow and then split it into lines, so we can report which
    // line numbers are problematic.
    const workflow = await fs.readFile(ymlFilePath, { encoding: "utf-8" });
    const lines = workflow.split("\n");

    // Capture which lines incorporate an invalid Node version
    const linesWithInvalidNodeReferences = [];

    for (const [index, line] of lines.entries()) {
      // Node could be referenced via a workflow job or step container.
      const [, nodeContainerVersion] = line.match(
        /container: node:(\d\S+)/
      ) ?? [null, false];

      if (nodeContainerVersion) {
        // We only care about invalid Node versions.
        const version = Number.parseInt(nodeContainerVersion, 10);
        if (version !== currentLTSVersion) {
          linesWithInvalidNodeReferences.push([index + 1, version]);
        }
      } else if (/\suses: actions\/setup-node/.test(line)) {
        // Node can alternatively be referenced via the setup-node action, where
        // the version is given as an input to the action. The input is not
        // required. We're going to go looking for it in subsequent lines. If we
        // find it, we'll include it; otherwise, we'll include a 0 to ensure the
        // test fails because not supplying the version number is a bad practice

        // Get the whitespace at the start of this line. We'll need it to figure
        // out when we've exited this Yaml block.
        const [leadingSpace] = line.match(/^\s+/);

        // If the line we're currently on starts with a dash, then it is the
        // start of a Yaml block, and the next Yaml block will begin with the
        // same amount of whitespace. Otherwise, this line is inside an existing
        // block and the next Yaml block will be de-indented two spaces from the
        // current line. In either case, the next Yaml block will also begin
        // with a dash. So here, we're building up a string that the next Yaml
        // block will begin with.
        const nextBreak = `${
          line.trim().startsWith("-") ? leadingSpace : leadingSpace.slice(2)
        }-`;

        let nextLine = line;
        let nextLineIndex = index;

        // By default, assume the Node version is not set and prepare to return
        // a value that will cause the tests to fail.
        let nodeVersion = "not set";

        // Now we're going to look at each line following the current one, up
        // to the next Yaml block or the end of the file.
        do {
          // We're looking for an input named node-version. Make sure we ignore
          // lines that are commented out.
          const [, inputNodeVersion] =
            nextLine.match(/^[^#]*node-version:\s*(\d*)/) ?? [];

          // If we got a Node version, numberize it and bail out of this loop
          // because we're done.
          if (inputNodeVersion) {
            nodeVersion = Number.parseInt(inputNodeVersion, 10);
            break;
          }

          nextLineIndex += 1;
          nextLine = lines[nextLineIndex];

          // We're done when there aren't anymore lines, or when the next line
          // starts with the right amount of whitespace and a dash, indicating
          // the start of the next Yaml block.
        } while (nextLine && !nextLine.startsWith(nextBreak));

        // If we did not find a Node version, use the line of the action itself;
        // otherwise, use the line where the Node version was set.
        if (nodeVersion === "not set") {
          linesWithInvalidNodeReferences.push([index + 1, nodeVersion]);
        } else if (nodeVersion !== currentLTSVersion) {
          linesWithInvalidNodeReferences.push([nextLineIndex + 1, nodeVersion]);
        }
      }
    }

    // If this workflow has lines that reference Node versions, add the workflow
    // to the list of all workflows with Node references.
    if (linesWithInvalidNodeReferences.length > 0) {
      workflowFileWithInvalidNodeReferences.push([
        ymlFilePath,
        linesWithInvalidNodeReferences,
      ]);
    }
  }

  return workflowFileWithInvalidNodeReferences;
};

(async () => {
  const currentLTSVersion = await getCurrentLTSVersion();
  const engineMajor = await getPackageNodeVersion();
  const dockerMajor = await getDockerNodeVersion();
  const invalidWorkflowNodes = await getWorkflowLinesWithInvalidNodeVersion(
    currentLTSVersion
  );

  if (
    engineMajor === currentLTSVersion &&
    dockerMajor === currentLTSVersion &&
    invalidWorkflowNodes.length === 0
  ) {
    process.exit(0);
  }

  if (engineMajor !== currentLTSVersion) {
    console.log("package.json is out of date");
    console.log(`  found Node ${engineMajor}; wanted ${currentLTSVersion}`);
  }
  if (dockerMajor !== currentLTSVersion) {
    console.log("Dockerfile is out of date");
    console.log(`  found Node ${dockerMajor}; wanted ${currentLTSVersion}`);
  }

  for (const [file, lines] of invalidWorkflowNodes) {
    console.log(`Workflow file ${file} is out of date`);
    for (const [line, version] of lines) {
      console.log(
        `  line ${line} uses Node ${version}; wanted ${currentLTSVersion}`
      );
    }
  }

  process.exit(1);
})();
