/**
 * Track Meet Facilitator Bot
 * Posts a message to the shared channel every 2nd/4th Friday at 11am PT
 * listing facilitators for the upcoming Wednesday track meets.
 * Reads facilitator names from each track's Slack Canvas table.
 */

const cron = require("node-cron");

/**
 * SHARED_CHANNEL_ID is the #usdc-all-fellows channel where the bot posts the message.
 */
const SHARED_CHANNEL_ID = "C05A6Q2PK6G";

/**
 * TRACK_CANVASES is an object mapping track names to their respective Slack Canvas IDs.
 */

const TRACK_CANVASES = {
  Cyber: "F091D6QD9RN",
  Data: "F091D7L8M5E",
  Design: "F090GG1L478",
  Product: "F090QH1MQMQ",
  Software: "F0911VCAJTB",
};

// ── DATE LOGIC ────────────────────────────────────────────────────────────────

function getWednesdayNumber(d) {
  return Math.floor((d.getDate() - 1) / 7) + 1;
}

const NEW_SCHEDULE_ANCHOR = new Date("2026-07-08"); // First track meet under new every-other-Wednesday rule

function isTrackMeetWeek(d) {
  if (d < NEW_SCHEDULE_ANCHOR) {
    // Old rule: 2nd and 4th Wednesdays only
    const n = getWednesdayNumber(d);
    return n === 2 || n === 4;
  }
  // New rule: every other Wednesday anchored to 7/8/26
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksDiff = Math.round((d - NEW_SCHEDULE_ANCHOR) / msPerWeek);
  return weeksDiff % 2 === 0;
}

function getNextWednesday() {
  const d = new Date();
  const daysAhead = (3 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + daysAhead);
  return d;
}

function getFridayBefore(wed) {
  const d = new Date(wed);
  d.setDate(d.getDate() - 5);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── CANVAS READING ────────────────────────────────────────────────────────────

async function getFacilitatorForDate(client, canvasId, targetDate) {
  const targetStrs = [
    targetDate.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "2-digit",
    }),
    targetDate.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    }),
    targetDate.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
  ];

  try {
    const res = await client.canvases.sections.lookup({
      canvas_id: canvasId,
      criteria: { section_types: ["any_ordered_list", "table"] },
    });

    for (const section of res.sections || []) {
      const content = section.content || "";
      for (const fmt of targetStrs) {
        if (content.includes(fmt)) {
          for (const line of content.split("\n")) {
            if (line.includes(fmt)) {
              const parts = line
                .split("|")
                .map((p) => p.trim())
                .filter(Boolean);
              if (parts.length >= 2) return parts[1];
            }
          }
        }
      }
    }
    return "TBD";
  } catch (err) {
    console.error(`Error reading canvas ${canvasId}:`, err.message);
    return "TBD";
  }
}

// ── MESSAGE BUILDER ───────────────────────────────────────────────────────────

function buildMessage(facilitators, facilitationDate) {
  const dateStr = formatDate(facilitationDate);
  const fridayStr = getFridayBefore(facilitationDate);
  const bullets = Object.entries(facilitators)
    .map(([track, name]) => `• ${track}: ${name}`)
    .join("\n");

  return `Track Meet facilitators on deck for ${dateStr}. Facilitators, please coordinate directly with any presenters and let the track channel know if there is anything they will need to prepare. Also, please share the agenda in your track channel (and in this thread, noting if the meet is open to other tracks!) by Noon ET on ${fridayStr}. The facilitators for next week's track meets are below:

${bullets}

To organize a cross-track meet, reach out to the facilitator for that track. Track facilitation schedules are also pinned in the respective track Slack channels. As a reminder, the track facilitation schedules can be found in the "Meet Facilitation Schedules" folder in this channel's tabs, above.

If you have a conflict (planned leave, agency conflict, etc) with your date to facilitate your track meet, it is your responsibility to coordinate a backup to cover facilitation.`;
}

// ── MAIN JOB ──────────────────────────────────────────────────────────────────

async function runBot(client) {
  const nextWed = getNextWednesday();
  console.log(`Track meet bot running. Next Wednesday: ${formatDate(nextWed)}`);

  if (!isTrackMeetWeek(nextWed)) {
    console.log(
      `Skipping — ${getWednesdayNumber(nextWed)} Wednesday of the month (all-hands or wild card).`,
    );
    return;
  }

const trackEntries = Object.entries(TRACK_CANVASES);
  const facilitatorList = await Promise.all(
    trackEntries.map(([, canvasId]) =>
      getFacilitatorForDate(client, canvasId, nextWed)),
  );
  const facilitators = {};
  trackEntries.forEach(([track], i) => {
    facilitators[track] = facilitatorList[i];
    console.log(`  ${track}: ${facilitators[track]}`);
  });

  const message = buildMessage(facilitators, nextWed);

  try {
    await client.chat.postMessage({
      channel: SHARED_CHANNEL_ID,
      text: message,
    });
    console.log("Track meet message posted successfully.");
  } catch (err) {
    console.error("Error posting message:", err.message);
  }
}

// ── CHARLIE ENTRY POINT ───────────────────────────────────────────────────────

module.exports = (app) => {
  // Runs every Friday at 11:00 AM PT (19:00 UTC during daylight saving time)
  cron.schedule(
    "0 19 * * 5",
    () => {
      runBot(app.client);
    },
    { timezone: "America/Los_Angeles" },
  );

  console.log("Track meet bot loaded. Scheduled for Fridays at 11:00 AM PT.");
};
