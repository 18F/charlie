const {
  cache,
  helpMessage,
  slack: { postEphemeralResponse },
  stats: { incrementStats },
} = require("../utils");
const sample = require("../utils/sample");

const identity = { icon_emoji: ":dna:", username: "NIH BioArt" };

const permitted = new Set([
  "fungi",
  "parasites",
  "animals",
  "arthropods",
  "bacteria",
  "cells and organelles",
  "plants",
  "viruses",
]);

const get = (url) =>
  fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0",
    },
  });

const getJSON = (url) => get(url).then((r) => r.json());

const getPermittedOntologyIDs = () =>
  cache("bio-art ontology id", 60, async () => {
    const allOntologies = await getJSON(
      "https://bioart.niaid.nih.gov/api/ontologies?type=Bioart%20Category",
    );

    return allOntologies
      .filter(({ ontologyKey }) => permitted.has(ontologyKey.toLowerCase()))
      .map(({ ontologyId }) => ontologyId);
  });

const getEntities = async (ontologyIds) =>
  cache(`bio-art entities [${ontologyIds.join(",")}]`, 300, async () => {
    const url = new URL("https://bioart.niaid.nih.gov");

    const search = [
      "type:bioart",
      `license:"Public Domain"`,
      `ontologyid:((${ontologyIds.join(" OR ")}))`,
    ];

    url.pathname = `api/search/${search.join(" AND ")}`;
    url.searchParams.set("size", 100);

    const {
      hits: { found, hit: initialList },
    } = await getJSON(url.href);

    const entities = [...initialList];

    while (entities.length < found) {
      url.searchParams.set("start", entities.length);
      const {
        hits: { hit: nextList },
      } = await getJSON(url.href); // eslint-disable-line no-await-in-loop
      entities.push(...nextList);
    }

    return entities;
  });

const getRandomEntity = async () => {
  const ontologyIds = await getPermittedOntologyIDs();
  const entities = await getEntities(ontologyIds);

  const { fields: entity } = sample(entities);

  const file = entity.filesinfo[0]
    .split("|")
    .find((s) => s.startsWith("PNG:"))
    .split(":")
    .pop()
    .split(",")
    .pop();

  const fileUrl = new URL(
    `https://bioart.niaid.nih.gov/api/bioarts/${entity.id[0]}/zip?file-ids=${file}`,
  ).href;

  return {
    title: entity.title.pop(),
    creator: entity.creator.pop(),
    fileUrl,
  };
};

if (require.main === module) {
  const main = async () => {
    const entity = await getRandomEntity();

    console.log(entity);
  };
  main();
}

module.exports = (app) => {
  helpMessage.registerInteractive(
    "Bio-Art",
    "bio-art",
    "Get a random piece of bio-art from our friends at the National Institutes of Health!",
  );

  app.message(/bio(-)?art/i, async (msg) => {
    incrementStats("bio-art");
    const { channel, thread_ts: thread } = msg.message;

    const entity = await getRandomEntity();
    const file = await get(entity.fileUrl)
      .then((r) => r.arrayBuffer())
      .then((a) => Buffer.from(a));

    app.client.filesUploadV2({
      ...identity,
      channel_id: channel,
      thread_ts: thread,
      initial_comment: `${entity.title} (art by ${entity.creator})`,
      file_uploads: [
        {
          file,
          filename: `${entity.title.toLowerCase()}.png`,
          alt_text: entity.title,
        },
      ],
    });
  });
};
