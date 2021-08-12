const { Intl, Temporal, toTemporalInstant } = require("@js-temporal/polyfill");

global.Intl.DateTimeFormat = Intl.DateTimeFormat;
global.Temporal = Temporal;

// eslint-disable-next-line no-extend-native
Date.prototype.toTemporalInstant = toTemporalInstant;
