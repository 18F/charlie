require("./env");
const crypto = require('crypto');
const axios = require("axios");
// const formurlencoded = require('form-urlencoded');

// NOTES: bolt's App object requires valid credentials to initialize, so .env must contain valid credentials

function calculateSignature(
  timestampHeader, // Get it from the request header x-slack-request-timestamp
  contentType, // Get it from the request header content-type
  signingSecret,
  body,
  signatureToCompare = null, // Get it from the request header x-slack-signature
){
  // Based on: https://stackoverflow.com/a/70688396
    
  let rawBody;
  if (contentType?.toLocaleLowerCase() === 'application/x-www-form-urlencoded') {
    // Slash commands are sent in this content type
    rawBody = formurlencoded(body);
  } else {
    var stringBody = JSON.stringify(body);
    rawBody = stringBody.replace(/\//g, '\\/').replace(/[\u007f-\uffff]/g, (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4));
  }
  const basestring = ['v0', timestampHeader, rawBody].join(':');
  const calculatedSignature = 'v0=' + crypto.createHmac('sha256', signingSecret).update(basestring).digest('hex');
  if (signatureToCompare) {
    // still broken
    const calculatedSignatureBuffer = Buffer.from(calculatedSignature, 'utf8');
    const requestSignatureBuffer = Buffer.from(signatureToCompare, 'utf8');
    const valid = crypto.timingSafeEqual(calculatedSignatureBuffer, requestSignatureBuffer)
    return valid
  }
  return calculatedSignature;
};

function spoofMessage(
  msg,
  token = "52YK4N4phElR07An4dC59yMR", // optional
  team_id = "TUMHGJ48G", // optional
  channel = "CUM5CUN5A", // optional
  api_app_id = "A02N5BNE13L", // optional
  user_id = "UUPDE22F9", // optional
  event_id = "Ev03HC9TGA86", // optional
  auth_user_id = "U02N2D5FRB7", // optional
  ) {

  const now = Date.now();
  const nowSeconds = Math.floor(now / 1000);
  const timestampHeader = nowSeconds.toString() // Get it from the request header x-slack-request-timestamp
  const inputBody = {
    "token": token,
    "team_id": team_id,
    "api_app_id": api_app_id,
    "event": {
      "client_msg_id": "220923fe-ac54-474b-839c-4aed523035eb",
      "type": "message",
      "text": msg,
      "user": user_id,
      "ts": "1653938696.488369",
      "team": "TUMHGJ48G",
      "blocks": [{
        "type": "rich_text",
        "block_id": "A+m9",
        "elements": [{
          "type": "rich_text_section",
          "elements": [{
            "type": "text",
            "text": msg
          }]
        }]
      }],
      "channel": channel,
      "event_ts": "1653938696.488369",
      "channel_type": "channel"
    },
    "type": "event_callback",
    "event_id": event_id,
    "event_time": nowSeconds,
    "authorizations": [{
      "enterprise_id": null,
      "team_id": team_id,
      "user_id": auth_user_id,
      "is_bot": true,
      "is_enterprise_install": false
    }],
    "is_ext_shared_channel": false,
    "event_context": "4-eyJldCI6Im1lc3NhZ2UiLCJ0aWQiOiJUVU1IR0o0OEciLCJhaWQiOiJBMDJONUJORTEzTCIsImNpZCI6IkNVTTVDVU41QSJ9"
  };
  const contentType = "application/json" // Get it from the request header content-type
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  
  let sig = calculateSignature(
    timestampHeader,
    contentType,
    signingSecret,
    inputBody,
  );

  const data = JSON.stringify(inputBody);

  const res = axios.post('http://localhost:3000/slack/events', inputBody, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'User-Agent': 'Slackbot 1.0 (+http://api.slack.com/robots)',
      'Accept-Encoding': 'gzip,deflate',
      'X-Slack-Request-Timestamp': timestampHeader,
      'X-Slack-Signature': sig
    }
  });
  
}

module.exports.calculateSignature = calculateSignature;
module.exports.spoofMessage = spoofMessage;