// Description:
// Ask for a Q* TTS initialism to be fully expanded to its full glory
//
// pulls information from config/q-expand.csv in this repo
// that csv file got its information from two Google Doc org charts
// FAS TTS High level:
// https://docs.google.com/presentation/d/1otRbhoGRN4LfDnWpN6zZ0ymjPpTBW3t79pIiuBREkCY/edit?usp=sharing
// TTS Solutions:
// https://docs.google.com/presentation/d/10Qfq1AaQh74q76Pik99kQedvshLBo0qLWZGsH-nrV0w/edit?usp=sharing
//
// XXX somewhere there's another google doc about TTS Client Services (18f, etc.), but can't find the link now
//
//  Dependencies:
//    "csv-parse": "5.0.4"
//
//
// Commands:
//    qex[p] INITIALISM
//
//    examples:
//    qexp QUEAAD
//    qex qq2

const { parse } = require("csv-parse");
const fs = require("fs");
const {
  stats: { incrementStats },
  helpMessage,
} = require("../utils");

function getCsvData() {
  const csvData = {};
  return new Promise((resolve) => {
    fs.createReadStream("config/q-expand.csv")
      .pipe(parse({ delimiter: "," }))
      .on("data", (csvrow) => {
        csvData[csvrow[0]] = csvrow[1];
      })
      .on("end", () => {
        resolve(csvData);
      });
  });
}

function getCodeLine(code, csvData) {
  return [
    "|".repeat(code.length - 1),
    "└──",
    // If this is a contractor code, replace the lowercase c with -C again
    code.endsWith("c") ? `${code.slice(0, code.length - 1)}-C` : code,
    ": ",
    code.endsWith("c") ? "Contractor" : csvData[code] ?? "???",
  ].join("");
}

function qExpander(expandThis, csvData) {
  // change -C to c, if it exists
  // lowercase c to disambiguate from other C endings not related to contractor
  const initialism = expandThis
    .toUpperCase()
    .replace(/-C$/, "c")
    .replace(/\*$/, "");

  const fullResponse = [expandThis.toUpperCase()];

  if (expandThis.endsWith("*") && csvData[initialism]) {
    const tree = new Map();

    const children = Object.keys(csvData)
      .filter((k) => k.startsWith(initialism) && k !== initialism)
      .sort();

    for (const child of children) {
      for (let substr = child.length - 1; substr >= 1; substr -= 1) {
        const parent = child.slice(0, substr);
        if (!tree.has(parent)) {
          tree.set(parent, new Set());
        }

        tree.get(parent).add(child.slice(0, substr + 1));
      }
    }

    const addChildrenToResponse = (code) => {
      for (const child of tree.get(code) ?? []) {
        addChildrenToResponse(child);
        fullResponse.push(getCodeLine(child, csvData));
      }
    };
    addChildrenToResponse(initialism);

    // For the root requested initialism, distinguish it from the rest by
    // putting asterisks around it. Unfortunately that won't bold it, but it's
    // something, at least?
    fullResponse.push(
      getCodeLine(initialism, csvData).replace(/└──(.*)$/, "└──*$1*"),
    );

    for (let substr = initialism.length - 1; substr > 0; substr -= 1) {
      fullResponse.push(getCodeLine(initialism.slice(0, substr), csvData));
    }
  } else {
    // work backwards from full initialism back on char at a time
    for (let substr = initialism.length; substr >= 1; substr -= 1) {
      const thisOne = initialism.slice(0, substr);
      fullResponse.push(getCodeLine(thisOne, csvData));
    }
  }

  // return the response block
  return fullResponse.join("\n");
}

module.exports = (app) => {
  helpMessage.registerInteractive(
    "Q-Expander",
    "qex [code]",
    "Ever wonder what the Q* initialisms are after everyone's names? Each letter describes where a person fits in the organization. Charlie can show you what those codes mean in tree-form, so you can see the organizational hierarchy!",
  );

  const csvData = module.exports.getCsvData();
  app.message(
    /^qexp?\s+([a-z0-9-]{1,8}\*?)$/i,
    async ({ message: { thread_ts: thread }, context, say }) => {
      incrementStats("qex expander");

      const initialismSearch = context.matches[1];
      const resp = qExpander(initialismSearch, await csvData);
      const response = {
        icon_emoji: ":tts:",
        username: "Q-Expander",
        text: `\`\`\`${resp}\`\`\``,
        thread_ts: thread,
      };
      say(response);
    },
  );
};
module.exports.getCsvData = getCsvData;
