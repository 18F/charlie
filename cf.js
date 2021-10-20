// A little helper script to create an SSH tunnel into Charlie that will forward
// local port 55433 to the database Charlie uses to store its brain. Can be a
// useful tool for debugging things that Charlie stores, like the coffeemate
// queue or opt-outs.
//
// 1. log into cloud.gov
// 2. target an org and space where Charlie is running
// 3. run "node cf.js" and wait
// 4. connect to Charlie's database at localhost, port 55433; you can find the
//    username and password are available with "cf env charlie"

const { exec } = require("child_process");

const getServiceCredentials = async () =>
  new Promise((resolve, reject) => {
    exec("cf env charlie", (err, stdout) => {
      if (err) {
        return reject(new Error(err));
      }
      const [, services] = stdout.match(/VCAP_SERVICES: ({[\s\S]+?})\n\n/s);
      const credentials = JSON.parse(services.trim());

      return resolve(credentials);
    });
  });

const main = async () => {
  const creds = await getServiceCredentials();
  if (creds["aws-rds"]) {
    const brainCreds = creds["aws-rds"].find(
      ({ name }) => name === "charlie-brain"
    );
    if (brainCreds) {
      exec(
        `cf ssh -L 55433:${brainCreds.credentials.host}:${brainCreds.credentials.port} charlie`,
        () => {
          console.log("connection terminated");
        }
      );
    } else {
      console.log("Couldn't find Charlie brain credentials");
    }
  } else {
    console.log("Couldn't find database credentials");
  }
};
main();
