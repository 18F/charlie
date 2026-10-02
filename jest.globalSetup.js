module.exports = () => {
  // The travel-team handler reads local day names out of moment(), and
  // utils/dates already treats America/New_York as the reference zone, so pin
  // it here. Without this, the tests pass on a UTC runner and fail for anyone
  // developing east of UTC.
  process.env.TZ = "America/New_York";
};
