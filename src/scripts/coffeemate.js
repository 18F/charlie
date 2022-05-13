const {
  slack: { addEmojiReaction, postEphemeralResponse, sendDirectMessage },
} = require("../utils");

const brainKey = "coffeemate_queue";

const baseResponse = {
  icon_emoji: ":coffee:",
  text: "You two have been paired up for coffee. The next step is to figure out a time that works for both of you. Enjoy! :coffee:",
  username: "Coffeemate",
};

module.exports = (app) => {
  app.message(/\bcoffee me\b/i, async (message) => {
    const {
      context: {
        matches: [, scopeMatch],
      },
      event: { user },
    } = message;

    // Ignore Slackbot. It's not supposed to trigger this bot anyway but it
    // seems like it has done so before, and then it gets stuck in the queue and
    // the only way to fix it is to manually clear out the database.
    if (user === "USLACKBOT") {
      return;
    }

    const scope = (() => {
      const out = scopeMatch ? scopeMatch.trim().toLowerCase() : "";
      return out === "please" ? "" : out;
    })();

    const key = `${brainKey}${scope}`;
    const queue = app.brain.get(key) || [];

    await addEmojiReaction(message, "coffee");

    // First, is the current user in already in the queue?
    // If so, just let them know
    if (queue.includes(user)) {
      await postEphemeralResponse(message, {
        ...baseResponse,
        text: `You’re already in the${
          scope ? ` ${scope}` : ""
        } queue. As soon as we find someone else to meet with, we’ll introduce you!`,
      });
      return;
    }

    // If we didn't bail out already, add the current user to the queue
    queue.push(user);
    app.brain.set(key, queue);

    // Now do we have a pair or not?
    if (queue.length < 2) {
      await postEphemeralResponse(message, {
        ...baseResponse,
        text: `You’re in line for${
          scope ? ` ${scope}` : ""
        } coffee! You’ll be introduced to the next person who wants to meet up.`,
      });
    } else {
      try {
        // pair them up
        await postEphemeralResponse(message, {
          ...baseResponse,
          text: `You’ve been matched up for coffee with <@${queue[0]}>! `,
        });

        // Now start a 1:1 DM chat between the people in queue.
        await sendDirectMessage([...queue], baseResponse);
      } catch (e) {
        // We don't really have a good way of capturing errors. The log is noisy
        // so just writing there isn't necessarily helpful, but we'll go ahead
        // and do it.
        app.logger.error(e);
      } finally {
        // And always empty the queue, no matter what; otherwise, users could
        // get stuck and we'd have to go manually edit the database to fix it.
        queue.length = 0;
        app.brain.set(key, queue);
      }
    }
  });
};
