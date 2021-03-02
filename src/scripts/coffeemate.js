const {
  slack: { addEmojiReaction, postEphemeralResponse, sendDirectMessage },
} = require("../utils");

const brainKey = "coffeemate_queue";

const baseResponse = {
  icon_emoji: ":coffee:",
  text:
    "You two have been paired up for coffee. The next step is to figure out a time that works for both of you. Enjoy! :coffee:",
  username: "Coffeemate",
};

module.exports = (app) => {
  app.message(/coffee me( \S+$)?/i, async (message) => {
    const [, scopeMatch] = message.context.matches;
    const scope = (() => {
      const out = scopeMatch ? scopeMatch.trim().toLowerCase() : "";
      return out === "please" ? "" : out;
    })();

    const key = `${brainKey}${scope}`;
    const queue = app.brain.get(key) || [];

    await addEmojiReaction(message, "coffee");
    const {
      event: { user },
    } = message;

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
      // pair them up
      await postEphemeralResponse(message, {
        ...baseResponse,
        text: `You’ve been matched up for coffee with <@${queue[0]}>! `,
      });

      // Now start a 1:1 DM chat between the people in queue.
      await sendDirectMessage([...queue], baseResponse);

      // then empty the queue again
      queue.length = 0;
      app.brain.set(key, queue);
    }
  });
};
