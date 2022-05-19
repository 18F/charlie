describe("homepage utility", () => {
  let homepage;
  beforeEach(() => {
    // Reset the module before each test so we can be sure we're starting from
    // a clean state, and anything we register in a test isn't lingering around
    jest.resetModules();
    homepage = require("./homepage"); // eslint-disable-line global-require
  });

  describe("supports the 'did you know section'", () => {
    it("returns an empty array if nothing is registered", () => {
      expect(homepage.getDidYouKnow("user id")).toEqual([]);
    });

    it("returns an array of responses from everything that's registered", () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      const fn3 = jest.fn();

      fn1.mockReturnValue("one");
      fn2.mockReturnValue(2);
      fn3.mockReturnValue(["three"]);

      homepage.registerDidYouKnow(fn1);
      homepage.registerDidYouKnow(fn2);
      homepage.registerDidYouKnow(fn3);

      expect(homepage.getDidYouKnow("user id")).toEqual(["one", 2, "three"]);
      expect(fn1).toHaveBeenCalledWith("user id");
      expect(fn2).toHaveBeenCalledWith("user id");
      expect(fn3).toHaveBeenCalledWith("user id");
    });
  });

  describe("supports the interactive section", () => {
    it("returns an empty array if nothing is registered", () => {
      expect(homepage.getInteractive("user id")).toEqual([]);
    });

    it("returns an array of responses from everything that's registered", () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      const fn3 = jest.fn();

      fn1.mockReturnValue("one");
      fn2.mockReturnValue(2);
      fn3.mockReturnValue(["three"]);

      homepage.registerInteractive(fn1);
      homepage.registerInteractive(fn2);
      homepage.registerInteractive(fn3);

      expect(homepage.getInteractive("user id")).toEqual(["one", 2, "three"]);
      expect(fn1).toHaveBeenCalledWith("user id");
      expect(fn2).toHaveBeenCalledWith("user id");
      expect(fn3).toHaveBeenCalledWith("user id");
    });
  });

  describe("supports refreshing the homepage", () => {
    it("does not fail if there is no registered refresher", () => {
      homepage.refresh();
    });

    it("calls the registered refresher", () => {
      const refresher = jest.fn();
      homepage.registerRefresh(refresher);

      homepage.refresh("user id", "client");

      expect(refresher).toHaveBeenCalledWith("user id", "client");
    });
  });
});
