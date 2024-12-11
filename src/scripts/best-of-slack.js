const bestOfSlack = new Set();

const getPermalink = async (event, client) =>
  client.chat
    .getPermalink({
      channel: event.item.channel,
      message_ts: event.item.ts,
    })
    .then((result) => result.permalink);

// const EMOJI = ":best-of-slack-award:";
const EMOJI = ":koala:";

// Events:
//   * reaction_added
//   * reaction_removed
//
// Scopes:
//   * reactions:read

module.exports = async (app) => {
  app.event("reaction_added", async ({ event, client }) => {
    const { reaction } = event;
    if (`:${reaction}:` === EMOJI) {
      const permalink = await getPermalink(event, client);
      bestOfSlack.add(permalink);
    }
  });

  app.event("reaction_removed", async ({ event, client }) => {
    const { reaction } = event;
    if (`:${reaction}:` === EMOJI) {
      const permalink = await getPermalink(event, client);
      bestOfSlack.delete(permalink);
    }
  });
};
