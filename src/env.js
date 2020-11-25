require("dotenv").config();

if (process.env.VCAP_SERVICES) {
  const cfEnv = JSON.parse(process.env.VCAP_SERVICES);
  if (Array.isArray(cfEnv["user-provided"])) {
    const config = cfEnv["user-provided"].find(
      ({ name }) => name === "charlie-config"
    );

    if (config) {
      Object.entries(config.credentials).forEach(([key, value]) => {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      });
    }
  }
}
