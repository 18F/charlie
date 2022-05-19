const {
  homepage: { getDidYouKnow, getInteractive, registerRefresh },
  optOut: { BRAIN_KEY: OPT_OUT_BRAIN_KEY, options: optOutOptions },
} = require("../utils");

const sleep = async (ms) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });

module.exports = async (app) => {
  const publishView = async (userId, client) => {
    // An item is enabled if it is NOT opted out of. The brain stores opt-out
    // information, not opt-in.
    const optedOut = app.brain.get(OPT_OUT_BRAIN_KEY) || {};
    for (const o of optOutOptions) {
      o.enabled = !optedOut[o.key]?.includes(userId);
    }

    const makeOptionFromOptout = (optout) => ({
      text: { type: "plain_text", text: optout.name },
      description: { type: "plain_text", text: optout.description },
      value: optout.key,
    });

    // https://charlie-dev.app.cloud.gov

    const view = {
      user_id: userId,
      view: {
        type: "home",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "Did you know?",
            },
          },
          ...getDidYouKnow(userId),
          { type: "divider" },
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "Interactions",
            },
          },
          ...getInteractive(userId),
          { type: "divider" },
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "Personalized Charlie options",
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "checkboxes",
                initial_options: optOutOptions
                  .filter(({ enabled }) => enabled)
                  .map(makeOptionFromOptout),
                options: optOutOptions.map(makeOptionFromOptout),
                action_id: "set_options",
              },
            ],
          },
        ],
      },
    };

    // initial_options cannot be an empty array for REASONS. So if there is one,
    // just delete it entirely. Also toss it out if it's not an array. Let's
    // just go ahead and be safe.
    for (const block of view.view.blocks || []) {
      for (const element of block.elements || []) {
        if (element.initial_options) {
          if (
            !Array.isArray(element.initial_options) ||
            element.initial_options.length === 0
          ) {
            delete element.initial_options;
          }
        }
      }
    }

    client.views.publish(view);
  };

  registerRefresh(publishView);

  // Wait a couple seconds for all the other scripts to run, so they can
  // register themselves with the opt-out handler. We'll use that to build up
  // the list of options for the home page. Ideally we'd be able to get some
  // kind of event when everything was done, but that doesn't exist and would
  // take a boatload of plumbing to hook up. Alternatively, this file could be
  // renamed in such a way that it gets loaded last since the scripts are run in
  // alphabetical order, but I don't think that's guaranteed so we probably
  // shouldn't rely on it. But you know what? This little delay is good enough
  // for now, and if it's ever not good enough, we can deal with that then.
  await sleep(2000);

  app.action(
    "set_options",
    async ({
      ack,
      action: { selected_options: options },
      body: {
        user: { id: userId },
      },
    }) => {
      await ack();

      // While reading this code, here's an important tip that will make it less
      // confusing: the brain stores who is OPTED OUT, but the value we receive
      // in this action lists items to be OPTED INTO. So there's some reversing
      // that has to happen to map those together.

      const optIn = options.map(({ value }) => value);
      let dirty = false;

      const optedOut = app.brain.get(OPT_OUT_BRAIN_KEY) || {};
      for (const key of Object.keys(optedOut)) {
        if (optIn.includes(key) && optedOut[key].includes(userId)) {
          const index = optedOut[key].indexOf(userId);
          optedOut[key].splice(index, 1);
          dirty = true;
        } else if (!optIn.includes(key) && !optedOut[key].includes(userId)) {
          optedOut[key].push(userId);
          dirty = true;
        }
      }
      if (dirty) {
        await app.brain.set(OPT_OUT_BRAIN_KEY, optedOut);
      }
    }
  );

  app.event("app_home_opened", ({ event, client }) =>
    publishView(event.user, client)
  );
};
