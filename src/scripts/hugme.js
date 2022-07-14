// Description:
//   Hugme is the most important thing in life
//
// Dependencies:
//   None
//
// Configuration:
//   None
//
// Commands:
//   @bot hug me - Receive a hug
//   @bot hug bomb N - get N hugs
//
// Notes:
// Images are stored in a bucket in S3.

const { directMention } = require("@slack/bolt");
const CFENV = require("cfenv");
const AWS = require("aws-sdk");
const {
  slack: { getChannelID },
  stats: { incrementStats },
} = require("../utils");

module.exports = (app) => {
  const appEnv = CFENV.getAppEnv();
  const s3Creds = appEnv.getServiceCreds("charlie-bucket");

  if (s3Creds !== null) {
    const creds = new AWS.Credentials(
      s3Creds.access_key_id,
      s3Creds.secret_access_key
    );
    const BUCKET = s3Creds.bucket;
    const REGION = s3Creds.region;
    const s3 = new AWS.S3({ region: REGION, credentials: creds });

    const hugUrl = ({ Key }) => {
      const rand = Math.floor(Math.random() * 10000);
      return `https://s3-${REGION}.amazonaws.com/${BUCKET}/${Key}?rnd=${rand}`;
    };

    module.exports.hugBomb = (count, { say }) =>
      new Promise((resolve) => {
        s3.listObjects({ Bucket: BUCKET }, async (err, data) => {
          if (err) {
            say(`Error retrieving images: ${err}`);
            resolve();
          } else {
            // Get some random things
            const s3Objects = [...Array(count)].map(() =>
              data.Contents.splice(
                Math.floor(Math.random() * data.Contents.length),
                1
              ).pop()
            );

            const blocks = s3Objects.map((s3Object) => ({
              type: "image",
              title: { type: "plain_text", text: "Please enjoy this warm hug" },
              image_url: hugUrl(s3Object),
              alt_text: "Someone giving you a nice hug",
            }));

            const channelID = await getChannelID("bots");

            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `_If you would like to be added, send a picture in <#${channelID}>_`,
              },
            });

            say({ blocks });
            resolve();
          }
        });
      });

    app.message(directMention(), /hug me/i, (msg) => {
      incrementStats("hug bot - single hug");
      module.exports.hugBomb(1, msg);
    });

    app.message(
      directMention(),
      /hug bomb( (\d+))?/i,
      ({ context: { matches }, ...msg }) => {
        incrementStats("hug bot - multiple hugs");
        const count = +matches[2] || 3;
        module.exports.hugBomb(count, msg);
      }
    );
  } else {
    console.log("Unable to find service creds for 'charlie-bucket'.");
  }
};
