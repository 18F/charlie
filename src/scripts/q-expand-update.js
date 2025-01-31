// Converts the XLSX downloaded from D2D into the CSV format expected by q-expand.js
// https://d2d.gsa.gov/dataset/gsa-organization
// (requires GSA login)
//
//  Dependencies:
//    "node-xlsx"
//    "csv-stringify"
//
// Run it via:
//   npm run q-expand-update -- PATH_TO_XLSX

const path = require("path");
const xlsx = require("node-xlsx");
const { stringify } = require("csv-stringify/sync");
const fs = require("fs");

/**
 * @typedef ConvertParams
 * @property {string} inXlsxPath
 * @property {string} outCsvPath
 */

/**
 * @param {ConvertParams} params
 */
function convert({ inXlsxPath, outCsvPath }) {
  const [
    {
      data: [header, ...inRows],
    },
  ] = xlsx.parse(inXlsxPath);

  const departmentIdIndex = header.indexOf("Department ID");
  const descriptionIndex = header.indexOf("Department Description");

  /**
   * @typedef Row
   * @property {string} stub - The abbreviation, like "Q"
   * @property {string} desc - The full name of the department, like "Office of the Commissioner"
   * */

  /** @type Row[] */
  const outRows = inRows.map((row) => {
    return { stub: row[departmentIdIndex], desc: row[descriptionIndex] };
  });

  const output = stringify([
    ["stub", "desc"],
    ...outRows.map(({ stub, desc }) => [stub, desc]),
  ]);
  fs.writeFileSync(outCsvPath, output);
}

if (typeof require !== "undefined" && require.main === module) {
  convert({
    inXlsxPath: process.argv[2],
    outCsvPath: path.resolve(__filename, "../../../config/q-expand.csv"),
  });
}

module.exports.convert = convert;
