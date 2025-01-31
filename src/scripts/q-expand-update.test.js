const xlsx = require("node-xlsx");
const { parse } = require("csv-parse/sync"); // eslint-disable-line import/no-unresolved
const Fs = require("fake-fs");
const path = require("path");
const { convert } = require("./q-expand-update");

describe("q-expand-update", () => {
  const inXlsxPath = "/tmp/path/to/source.xlsx";
  const xlsxData = [
    ["Snapshot Date", "Department ID", "Department Description"],
    ["12/31/2024", "Q", "Top level"],
    ["12/31/2024", "QQ", "One depth"],
  ];
  let fs;

  beforeEach(() => {
    fs = new Fs();
    fs.dir(path.dirname(inXlsxPath));
    fs.writeFileSync(inXlsxPath, xlsx.build([{ data: xlsxData }]));
    fs.patch();
  });

  it("converts xlsx into csv", () => {
    const outCsvPath = "/tmp/path/to/out.csv";

    convert({
      inXlsxPath,
      outCsvPath,
    });

    const written = parse(fs.readFileSync(outCsvPath));
    expect(written).toEqual([
      ["stub", "desc"],
      ["Q", "Top level"],
      ["QQ", "One depth"],
    ]);
  });

  afterEach(() => {
    fs.unpatch();
  });
});
