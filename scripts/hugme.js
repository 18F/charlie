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
//   hubot hug me - Receive a hug
//   hubot hug bomb N - get N hugs
//
// Notes:
// Images are stored in a bucket in S3.

const CFENV = require('cfenv');
const AWS = require('aws-sdk');
const underscore = require('underscore');

const appEnv = CFENV.getAppEnv();
const s3Creds = appEnv.getServiceCreds('charlie-bucket');

if (s3Creds !== null) {
  console.log("Found service creds for 'charlie-bucket'.");

  const creds = new AWS.Credentials(
    s3Creds.access_key_id,
    s3Creds.secret_access_key
  );
  const BUCKET = s3Creds.bucket;
  const REGION = s3Creds.region;
  const s3 = new AWS.S3({ region: REGION, credentials: creds });

  const hugUrl = s3Object => {
    const filename = s3Object.Key;
    const rand = underscore.random(10000);
    return `https://s3-${REGION}.amazonaws.com/${BUCKET}/${filename}?rnd=${rand}`;
  };

  const hugBomb = (count, msg) => {
    s3.listObjects({ Bucket: BUCKET }, (err, data) => {
      if (err) {
        msg.reply(`Error retrieving images: ${err}`);
      } else {
        // send unique URLs
        const s3Objects = underscore.sample(data.Contents, count);
        for (let i = 0; i < s3Objects.length; i += 1) {
          const s3Object = s3Objects[i];
          const url = hugUrl(s3Object);
          msg.send(url);
        }
        msg.send('_If you would like to be added, send a picture in #bots._');
      }
    });
  };

  module.exports = robot => {
    if (s3Creds === null) {
      return;
    }

    robot.respond(/hug me/i, msg => {
      hugBomb(1, msg);
    });

    robot.respond(/hug bomb( (\d+))?/i, msg => {
      const count = msg.match[2] || 3;
      hugBomb(count, msg);
    });
  };
} else {
  console.log("Unable to find service creds for 'charlie-bucket'.");
}
