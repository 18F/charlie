const {
  homepage,
  slack: { addEmojiReaction, postEphemeralResponse, sendDirectMessage },
} = require("../utils");

const brainKey = "coffeemate_queue";

const COFFEE_ACTION_ID = "coffee_me";
const UNCOFFEE_ACTION_ID = "un_coffee_me";

const baseResponse = {
  icon_emoji: ":coffee:",
  text: "You two have been paired up for coffee. The next step is to figure out a time that works for both of you. Enjoy! :coffee:",
  username: "Coffeemate",
};

module.exports = (app) => {
  const addToCoffeeQueue = async (userId, message = false, scope = "") => {
    const key = `${brainKey}${scope}`;
    const queue = app.brain.get(key) || [];

    if (queue.includes(userId)) {
      // If the request to be added to the queue came from a Slack message,
      // let the user know they're already in the queue. This request can also
      // come from a homepage interaction, in which case we already display that
      // they're in the queue.
      if (message) {
        await postEphemeralResponse(message, {
          ...baseResponse,
          text: `You’re already in the${
            scope ? ` ${scope}` : ""
          } queue. As soon as we find someone else to meet with, we’ll introduce you!`,
        });
      }
      return;
    }

    queue.push(userId);
    app.brain.set(key, queue);

    // Now do we have a pair or not?
    if (queue.length < 2) {
      if (message) {
        await postEphemeralResponse(message, {
          ...baseResponse,
          text: `You’re in line for${
            scope ? ` ${scope}` : ""
          } coffee! You’ll be introduced to the next person who wants to meet up.`,
        });
      }
    } else {
      try {
        // pair them up
        if (message) {
          await postEphemeralResponse(message, {
            ...baseResponse,
            text: `You’ve been matched up for coffee with <@${queue[0]}>! `,
          });
        }

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
  };

  homepage.registerInteractive((userId) => {
    const inQueue = app.brain.get(brainKey)?.includes(userId);

    if (inQueue) {
      return {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:coffee: You’re in the coffee queue! As soon as we find someone else to meet with, we’ll introduce you.`,
        },
        accessory: {
          type: "button",
          text: { type: "plain_text", text: "Leave queue" },
          action_id: UNCOFFEE_ACTION_ID,
        },
      };
    }

    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":coffee: Sign up for a virtual coffee",
      },
      accessory: {
        type: "button",
        text: { type: "plain_text", text: "Coffee Me!" },
        action_id: COFFEE_ACTION_ID,
      },
    };
  });

  app.action(
    UNCOFFEE_ACTION_ID,
    async ({
      ack,
      body: {
        user: { id: userId },
      },
      client,
    }) => {
      await ack();

      const queue = app.brain.get(brainKey) || [];
      const index = queue.findIndex((id) => id === userId);

      if (index >= 0) {
        queue.splice(index, 1);
        app.brain.set(brainKey, queue);

        // Now that the user's queue status has changed, update the homepage.
        homepage.refresh(userId, client);
      }
    }
  );

  app.action(
    COFFEE_ACTION_ID,
    async ({
      ack,
      body: {
        user: { id: userId },
      },
      client,
    }) => {
      await ack();

      await addToCoffeeQueue(userId);

      // The user's queue status may have changed; update the homepage in case.
      homepage.refresh(userId, client);
    }
  );

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

    await addEmojiReaction(message, "coffee");

    await addToCoffeeQueue(user, message, scope);
  });
};

module.exports.COFFEE_ACTION_ID = COFFEE_ACTION_ID;
module.exports.UNCOFFEE_ACTION_ID = UNCOFFEE_ACTION_ID;
module.exports.BRAIN_KEY = brainKey;
