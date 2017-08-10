// Description:
//   Ask if a piece of software is approved by GSA
//
// Depdeendencies:
//   "csvtojson": "1.1.7"
//
// Commands:
//   hubot is <software> approved
//
// Examples:
//   hubot is slack approved

const csv = require('csvtojson');
let _robot = null;

const colors = {
  'Proposed': '#f9c642',
  'Approved': '#2e8540',
  'Sunsetting': '#e7f4e4',
  'Denied': '#e31c3d'
};

const getCSV = () => new Promise((resolve, reject) => {
  _robot.http('https://raw.githubusercontent.com/GSA/data/gh-pages/enterprise-architecture/it-standards.csv')
    .header('User-Agent', '18F-bot')
    .get()((err, res, body) => {
      if (err || !body || res.statusCode < 200 || res.statusCode > 299) {
        return reject(err || `Couldn't get CSV file, HTTP status ${res.statusCode}`);
      }
      return resolve(body);
    });
});

const getColor = (status) => {
  const shortStatus = status.match(/^\S+/)[0];
  if (colors[shortStatus]) {
    return colors[shortStatus];
  }
  return '#aeb0b5';
};

const getAttachment = item => ({
  title: `${item.name} - ${item.status}`,
  fallback: `${item.name} - ${item.status}`,
  fields: [{
    title: '',
    value: `this is a ${item.platform} product`,
    short: false
  }],
  color: getColor(item.status),
});

const getMessage = (target) => {
  const lookingFor = target.toLowerCase();
  return getCSV().then(body => {
    const matches = [];

    return new Promise((resolve, reject) => {
      csv().fromString(body)
        .on('csv', (item) => {
          // Can't be certain the CSV is right, but we can at least
          // make sure it has the right number of fields
          if(item.length > 4 && item[0].toLowerCase().includes(lookingFor)) {
            matches.push({ name: item[0], status: item[3], platform: item[4] })
          }
        }).on('done', () => {
          let message = ''
          if (matches.length == 0) {
            message = `I didn't find anything in the GSA IT Standards for ${target}`;
          } else if (matches.length <= 5) {
            message = { attachments: matches.map(getAttachment) };
            message.attachments[0].pretext = `Here's what I found in the GSA IT Standards`;
          } else {
            const finds = matches.map((item) => `*${item.name}* (${item.status})`)
            message = `I found several potential matches for ${target}: ${finds.join(' | ')}`;
          }
          resolve(message);
        }).on('error', err => reject(err));
      });
    });
};

const handler = (msg) => {
  const lookingFor = msg.match[1].toLowerCase();
  getMessage(lookingFor).then(message => {
    msg.send(message);
  }).catch(err => {
    console.log('Error in gsa-approved-software script:');
    console.log(err);
  });
};

module.exports = (robot) => {
  _robot = robot
  robot.respond(/is (.+) app?roved/i, handler);
  robot.hear(/(\S+) is app?roved\?/i, handler)
};
