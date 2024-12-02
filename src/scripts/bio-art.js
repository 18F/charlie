const {
  cache,
  helpMessage,
  slack: { postFile, postMessage },
  stats: { incrementStats },
} = require("../utils");
const sample = require("../utils/sample");

// The set of ontologies we want. Some of them could be questionable, like
// human anatomy, so leave those out. Maybe after we review them all more
// thoroughly, we can decide whether to add more!
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
  // The BioArt API requires a browser user-agent, so put that in here.
  fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0",
    },
  });

const getJSON = (url) => get(url).then((r) => r.json());

const getPermittedOntologyIDs = () =>
  // The list of ontologu IDs is unlikely to change very often, so cache it
  // for an hour.
  cache("bio-art ontology id", 60, async () => {
    const allOntologies = await getJSON(
      "https://bioart.niaid.nih.gov/api/ontologies?type=Bioart%20Category",
    );

    // Filter down to just the keys that we've allowed, and then map down to
    // just the ontology IDs. That's all we need going forward.
    return allOntologies
      .filter(({ ontologyKey }) => permitted.has(ontologyKey.toLowerCase()))
      .map(({ ontologyId }) => ontologyId);
  });

const getEntities = async (ontologyIds) =>
  // The list of entities might change more often than the list of ontology IDs,
  // so we can cache it for a little shorter.
  cache(`bio-art entities [${ontologyIds.join(",")}]`, 30, async () => {
    const url = new URL("https://bioart.niaid.nih.gov");

    // The search string is part of the URL path, which is unusual. Anyway, it's
    // these fields and values.
    const search = [
      "type:bioart",
      `license:"Public Domain"`,
      `ontologyid:((${ontologyIds.join(" OR ")}))`,
    ];

    // Now put the whole path together.
    url.pathname = `api/search/${search.join(" AND ")}`;

    // And add a query parameter for the number of entities to fetch. There may
    // be more entities, but we'll deal with that later.
    url.searchParams.set("size", 100);

    // found is the total number of entities that are responsive to our search,
    // and hit (initialList) is the first batch of those matches.
    const {
      hits: { found, hit: initialList },
    } =
      // Use the URL.href method so it properly escapes the path and search
      // parameters. This way we don't have to think about it. :)
      await getJSON(url.href);

    const entities = [...initialList];

    // If the number of entities we've received is less than the total number of
    // entities that match our search, run the search again but add the "start"
    // query paramemter so we get the next batch. Repeat until we have all of
    // the responsive entities.
    while (entities.length < found) {
      url.searchParams.set("start", entities.length);
      const {
        hits: { hit: nextList },
      } = await getJSON(url.href); // eslint-disable-line no-await-in-loop
      entities.push(...nextList);
    }

    // And finally, we only want the field data, so map down to just that.
    return entities.map(({ fields }) => fields);
  });

const getRandomEntity = async () => {
  const ontologyIds = await getPermittedOntologyIDs();
  const entities = await getEntities(ontologyIds);

  const entity = sample(entities);

  // An entity can have multiple variations, each with multiple files. We'll
  // just grab the first variant. For a given varient, the list of files is a
  // string of the form:
  //
  //    FORMAT:id|FORMAT:id,id,id|FORMAT:id
  //
  // Where FORMAT is an image format such as PNG and the ids are a list of file
  // IDs used to actually fetch the file. So we'll grab the list of PNG file IDs
  // and then take the last one, for simplicity's sake.
  const file = entity.filesinfo[0]
    .split("|")
    .find((s) => s.startsWith("PNG:"))
    .split(":")
    .pop()
    .split(",")
    .pop();

  // Once we have the file ID, we can build up a URL to fetch it.
  const fileUrl = new URL(
    `https://bioart.niaid.nih.gov/api/bioarts/${entity.id[0]}/zip?file-ids=${file}`,
  ).href;

  // All we want from the entity is its title, creator, and download URL.
  return {
    title: entity.title.pop(),
    creator: entity.creator.pop(),
    fileUrl,
  };
};

module.exports = (app) => {
  helpMessage.registerInteractive(
    "Bio-Art",
    "bio-art",
    "Get a random piece of bio-art from our friends at the National Institutes of Health!",
  );

  app.message(/bio(-| )?art/i, async (msg) => {
    incrementStats("bio-art");
    const { channel, thread_ts: thread } = msg.message;

    try {
      // Get an entity
      const entity = await getRandomEntity();
      // Get its image file as a buffer
      const file = await get(entity.fileUrl)
        .then((r) => r.arrayBuffer())
        .then((a) => Buffer.from(a));

      // Post that sucker to Slack.
      postFile({
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
    } catch (e) {
      app.logger.error("bio-art error:");
      app.logger.error(e);

      postMessage({
        channel,
        thread_ts: thread,
        text: "There was a problem fetching BioArt.",
      });
    }
  });
};
