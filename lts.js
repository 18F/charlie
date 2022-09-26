const fs = require("fs/promises");
const path = require("path");

(async () => {
  const LTS_SCHEDULE_URL =
    "https://raw.githubusercontent.com/nodejs/Release/main/schedule.json";

  const versions = await fetch(LTS_SCHEDULE_URL).then((r) => r.json());

  const currentLTS = +Object.entries(versions)
    .map(([version, metadata]) => ({
      version: version.replace(/\D/g, ""),
      lts: metadata.lts ?? false,
    }))
    .filter(({ lts }) => lts !== false)
    .map((o) => ({ ...o, lts: new Date(o.lts).getTime() }))
    .sort(({ lts: a }, { lts: b }) => a - b)
    .filter(({ lts }) => lts < Date.now())
    .pop().version;

  const pkg = JSON.parse(await fs.readFile("./package.json"));
  const engineMajor = +pkg.engines.node.split(".")[0].replace(/\D/g, "");

  const workflowPath = ".github/workflows";
  const ymls = (await fs.readdir(workflowPath))
    .filter((f) => f.endsWith(".yml"))
    .map((f) => path.join(workflowPath, f));

  const workflowsWithOldNode = await Promise.all(
    ymls.map(async (yml) => {
      const workflow = await fs.readFile(yml, { encoding: "utf-8" });

      const lines = workflow
        .split("\n")
        .map((line, lineNumber) => {
          const m = line.match(/node:(\d\S+)/)?.[1] ?? false;
          if (m && +m < currentLTS) {
            return [lineNumber + 1, +m];
          }
          return false;
        })
        .filter((v) => v);

      if (lines.length > 0) {
        return [yml, lines];
      }
      return false;
    })
  ).then((l) => l.filter((v) => v));

  const dockerfile = await fs.readFile("Dockerfile", { encoding: "utf-8" });
  const dockerNodeVersion = +dockerfile.split("\n")[0].split(":").pop();

  if (
    engineMajor >= currentLTS &&
    dockerNodeVersion >= currentLTS &&
    workflowsWithOldNode.length === 0
  ) {
    process.exit(0);
  }

  if (engineMajor < currentLTS) {
    console.log("package.json is out of date");
    console.log(`  found Node ${engineMajor}; wanted ${currentLTS}`);
  }
  if (dockerNodeVersion < currentLTS) {
    console.log("Dockerfile is out of date");
    console.log(`  found Node ${engineMajor}; wanted ${currentLTS}`);
  }

  for (const [file, lines] of workflowsWithOldNode) {
    console.log(`Workflow file ${file} is out of date`);
    for (const [line, version] of lines) {
      console.log(`  line ${line} uses Node ${version}; wanted ${currentLTS}`);
    }
  }

  process.exit(1);
})();
