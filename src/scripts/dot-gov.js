/** Description:
 * Be entertained (and maybe helped) with .gov domains.
 *
 * In the git.gov version, Charlie listens for "git.gov" in any message
 * and responds with a random government domain.
 *
 * In the get .gov version, Charlie must be addressed directly. This
 * version allows filtering by domain type and searching.
 *
 * The format is @Charlie [entity] <trigger> [search term].
 *
 * If an entity is specified, Charlie limits the search to domains
 * of that entity type.
 *
 * In the case that a search term is given, Charlie responds
 * with up to five randomly chosen matches or with a message
 * indicating that no domain matched the search.
 *
 * In the case of no search term, Charlie responds with one
 * random domain.
 *
 *  Dependencies:
 *    "csv-parse"
 *
 * Commands:
 *    (entity) get.gov (search term)
 *
 *    examples:
 *        git.gov
 *        get.gov
 *        .gov
 *        tribal .gov
 *        city .gov Lanesboro
 */

const { directMention } = require("@slack/bolt");
const axios = require("axios");
const https = require("https");

/* eslint-disable import/no-unresolved */
const { parse } = require("csv-parse/sync");
/* eslint-enable import/no-unresolved */

const { cache, helpMessage } = require("../utils");

/** A regex string for searching the 9 types of .gov domain entities in a variety of ways. */
const domainTypesRegex = [
  "Gov(ernment)?",
  "City",
  "County",
  "Executive(\\sBranch)?",
  "Judicial(\\sBranch)?",
  "Legislative(\\sBranch)?",
  "Fed(eral)?",
  "(Ind(ependent)?\\s)?Intra(state)?",
  "Inter(state)?",
  "State",
  "Trib(e|(al))",
]
  .map((domain) => `(${domain})`) // add parentheses around each group
  .join("|"); // join them with pipe separators

/** A regex string for catching the user's trigger. */
const gitGovRegex = new RegExp(
  [
    `((?<re_type>${domainTypesRegex})\\s)?`,
    "((g[ei]t\\s?)?\\.gov)",
    "(\\s(?<re_search>.+))?",
  ].join(""),
  "i"
);

/** A file hosted in GitHub which is regularly updated with domains. */
const CISA_DOTGOV_DATA_URL =
  "https://raw.githubusercontent.com/cisagov/dotgov-data/main/current-full.csv";

/** Current list of domain categories. */
const DOMAIN_TYPES = {
  CITY: "City",
  COUNTY: "County",
  EXECUTIVE: "Federal - Executive",
  JUDICIAL: "Federal - Judicial",
  LEGISLATIVE: "Federal - Legislative",
  INDEPENDENT_INTRASTATE: "Independent Intrastate",
  INTERSTATE: "Interstate",
  STATE: "State",
  TRIBAL: "Tribal",
};

/** Current list of fields available in the CSV file. */
const DATA_FIELDS = {
  NAME: "Domain Name",
  TYPE: "Domain Type",
  AGENCY: "Agency",
  ORG: "Organization",
  CITY: "City",
  STATE: "State",
};

/**
 * Helper function.
 *
 * Takes an array of objects `data` and constructs a new array
 * containing only objects which match `term` within `field`.
 *
 * Every object must have `field` as a property.
 *
 * Returns the filtered array.
 */
const filterBy = (field, term, data) =>
  data.filter((d) => d[field].match(new RegExp(term, "i")));

/**
 * Helper function.
 *
 * Given an array of domain objects as `data` and
 * a desired `entity` such as city, county, etc.
 *
 * Returns an array of all matching domain objects.
 */
const narrowResultsByEntity = (entity, data) => {
  const filterByType = (term) => filterBy(DATA_FIELDS.TYPE, term, data);
  if (/City/i.test(entity)) {
    return filterByType(DOMAIN_TYPES.CITY);
  }
  if (/County/i.test(entity)) {
    return filterByType(DOMAIN_TYPES.COUNTY);
  }
  if (/Executive(\sBranch)?/i.test(entity)) {
    return filterByType(DOMAIN_TYPES.EXECUTIVE);
  }
  if (/Judicial(\sBranch)?/i.test(entity)) {
    return filterByType(DOMAIN_TYPES.JUDICIAL);
  }
  if (/Legislative(\sBranch)?/i.test(entity)) {
    return filterByType(DOMAIN_TYPES.LEGISLATIVE);
  }
  if (/Fed(eral)?/i.test(entity)) {
    return [
      ...filterByType(DOMAIN_TYPES.EXECUTIVE),
      ...filterByType(DOMAIN_TYPES.JUDICIAL),
      ...filterByType(DOMAIN_TYPES.LEGISLATIVE),
    ];
  }
  if (/(Ind(ependent)?\s)?Intra(state)?/i.test(entity)) {
    return filterByType(DOMAIN_TYPES.INDEPENDENT_INTRASTATE);
  }
  if (/Inter(state)?/i.test(entity)) {
    return filterByType(DOMAIN_TYPES.INTERSTATE);
  }
  if (/State/i.test(entity)) {
    return filterByType(DOMAIN_TYPES.STATE);
  }
  if (/Trib(e|(al))/i.test(entity)) {
    return filterByType(DOMAIN_TYPES.TRIBAL);
  }
  // if /Gov(ernment)?/i.test(entity)
  return data;
};

/**
 * Helper function.
 *
 * Given an array of items as `domainsArr`
 * and a number to select `numToSelect`.
 *
 * Returns an array of randomly selected items.
 */
const selectDomainsAtRandom = (domainsArr, numToSelect) => {
  const output = new Set();
  if (domainsArr.length >= numToSelect) {
    while (output.size < numToSelect) {
      const randInt = Math.floor(Math.random() * domainsArr.length);
      output.add(domainsArr[randInt]);
    }
  }
  return Array.from(output);
};

/**
 * Helper function.
 *
 * Given a domain object `domainObj` and an optional `timeout`,
 *
 * Returns a human-readable response status.
 */
const checkDomainStatus = async (domainObj, timeout = 2000) =>
  axios
    .head(`https://${domainObj[DATA_FIELDS.NAME]}`, {
      timeout,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    })
    .then((response) => {
      if (response && response.status) {
        return response.statusText;
      }
      return "Unknown Status";
    })
    .catch((error) => {
      if (error.response) {
        return error.response.statusText;
      }
      if (error.code === "CERT_HAS_EXPIRED") {
        return "Cert Expired";
      }
      return "Unknown Status";
    });

module.exports = (app) => {
  helpMessage.registerInteractive(
    ".Gov",
    "git.gov",
    "There are over 7,000 .gov domains on the net! Charlie can give you one at random.",
    false
  );

  helpMessage.registerInteractive(
    ".Gov",
    "Curious if a (city, state, tribal, judicial...) domain exists (for X)? Charlie can help you find out!",
    "(entity) .gov (search term)",
    true
  );

  /** Exposed only for testing. */
  module.exports.gitGovRegex = gitGovRegex;

  /**
   * Transform a search term into a slack message.
   *
   * This function obtains a copy of the list of currently registered
   * .gov domains in CSV format, then filters them by an (optional)
   * `entity`, then filters them by an (optional) search term, and
   * finally, formats the results as a series of slack messages.
   *
   * Those messages are passed to `say` for display to the user.
   */
  module.exports.dotGov = async ({ entity, searchTerm, say, thread }) => {
    // fetch the domain list
    const domains = await cache("dotgov domains", 1440, async () =>
      axios
        .get(CISA_DOTGOV_DATA_URL)
        .then((response) => {
          if (response && response.data) {
            return parse(response.data, { columns: true });
          }
          return [];
        })
        .catch(() => [])
    );

    let filteredDomains = [];
    let headerText = null;
    let output = [];
    const blocks = [];

    const searchTermExists = typeof searchTerm === "string" && searchTerm;
    const entityExists = typeof entity === "string" && entity;

    // if requested, confine the search to a particular governmental body
    if (entityExists) {
      filteredDomains = narrowResultsByEntity(entity, domains);
    } else {
      filteredDomains = domains;
    }

    // if a search term is given, see if we can find a match
    if (searchTermExists) {
      const filterByField = (field) =>
        filterBy(field, searchTerm, filteredDomains);
      filteredDomains = Array.from(
        new Set([
          ...filterByField(DATA_FIELDS.NAME),
          ...filterByField(DATA_FIELDS.ORG),
          ...filterByField(DATA_FIELDS.AGENCY),
          ...filterByField(DATA_FIELDS.CITY),
          ...filterByField(DATA_FIELDS.STATE),
          ...filterByField(DATA_FIELDS.TYPE),
        ])
      );
    }

    const numResults = filteredDomains.length;

    // pluralize
    const domainText = entityExists ? `${entity} domains` : "domains";

    // format a salutation
    if (numResults > 0 && searchTermExists) {
      headerText = `Here's what I could find for ${domainText} related to "${searchTerm}".`;
      const numToDisplay = numResults > 5 ? 5 : numResults;
      output = selectDomainsAtRandom(filteredDomains, numToDisplay);
    } else if (numResults > 0) {
      headerText = `There are ${numResults} \`.gov\` ${domainText} right now! Have you seen this one?`;
      output = selectDomainsAtRandom(filteredDomains, 1);
    } else if (numResults === 0 && searchTermExists) {
      headerText = `I found nothing related to "${searchTerm}", sorry.`;
    }

    // add salutation to the response
    if (headerText) {
      blocks.push({
        type: "section",
        text: {
          text: headerText,
          type: "mrkdwn",
        },
      });
    }

    // get the status of domains
    const domainStatus = output.map((d) => checkDomainStatus(d));
    await Promise.all(domainStatus);

    // add each domain (max of 5) to the response
    for (const [index, domain] of output.entries()) {
      const name = domain[DATA_FIELDS.NAME];
      const status = domainStatus[index];
      const agency = domain[DATA_FIELDS.AGENCY];
      const city = domain[DATA_FIELDS.CITY];
      const state = domain[DATA_FIELDS.STATE];
      blocks.push({
        type: "section",
        text: {
          text:
            `<https://${name}|${name}> (${status}), ` +
            `presented by _${agency}_ in _${city}_, _${state}_`,
          type: "mrkdwn",
        },
      });
    }

    // let the user know if their search turned up more than 5 results
    if (numResults > 5 && searchTermExists) {
      const numOtherResults = numResults - 5;
      const others = numOtherResults > 1 ? "others" : "other";
      blocks.push({
        type: "section",
        text: {
          text: `. . . plus ${numOtherResults} ${others}.`,
          type: "mrkdwn",
        },
      });
    }

    // if there is anything to say, say it!
    if (blocks.length) {
      say({
        icon_emoji: ":dotgov:",
        thread_ts: thread,
        username: ".Gov",
        unfurl_links: false,
        unfurl_media: false,
        blocks,
      });
    }
  };

  /** git.gov version */
  app.message(/git\.gov/i, async ({ message: { thread_ts: thread }, say }) => {
    await module.exports.dotGov({ say, thread });
  });

  /** get .gov version */
  app.message(
    directMention(),
    gitGovRegex,
    async ({ message: { thread_ts: thread }, context, say }) => {
      const args = {
        entity: context.matches.groups.re_type,
        searchTerm: context.matches.groups.re_search,
        say,
        thread,
      };
      await module.exports.dotGov(args);
    }
  );
};
