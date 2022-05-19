const didYouKnow = [];
const interactive = [];

let refresh = async () => {};

module.exports = {
  getDidYouKnow(userId) {
    return didYouKnow.flatMap((cb) => cb(userId));
  },

  getInteractive(userId) {
    return interactive.flatMap((cb) => cb(userId));
  },

  refresh: (userId, client) => refresh(userId, client),

  registerDidYouKnow(callback) {
    didYouKnow.push(callback);
  },

  registerInteractive(callback) {
    interactive.push(callback);
  },

  registerRefresh(callback) {
    refresh = callback;
  },
};
