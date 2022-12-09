const {
  axios,
  getApp,
  utils: { cache },
} = require("../utils/test");

const script = require("./dot-gov");

describe("dot-gov domains", () => {
  const app = getApp();
  const mockCache = [
    {
      Agency: "Non-Federal Agency",
      City: "Albany",
      "Domain Name": "ALBANYCA.GOV",
      "Domain Type": "City",
      Organization: "City of Albany",
      "Security Contact Email": "(blank)",
      State: "CA",
    },
    {
      Agency: "Non-Federal Agency",
      City: "Belle Plaine",
      "Domain Name": "BELLEPLAINEIOWA.GOV",
      "Domain Type": "City",
      Organization: "City of Belle Plaine",
      "Security Contact Email": "(blank)",
      State: "IA",
    },
    {
      Agency: "U.S. Department of Agriculture",
      City: "Washington",
      "Domain Name": "RURAL.GOV",
      "Domain Type": "Federal - Executive",
      Organization: "Rural Development",
      "Security Contact Email": "cyber.(blank)",
      State: "DC",
    },
    {
      Agency: "The Supreme Court",
      City: "Washington",
      "Domain Name": "SUPREMECOURTUS.GOV",
      "Domain Type": "Federal - Judicial",
      Organization: "Supreme Court of the United Statest",
      "Security Contact Email": "(blank)",
      State: "DC",
    },
    {
      Agency: "Government Publishing Office",
      City: "Washington",
      "Domain Name": "USCODE.GOV",
      "Domain Type": "Federal - Legislative",
      Organization: "United States Government Publishing Office",
      "Security Contact Email": "(blank)",
      State: "DC",
    },
    {
      Agency: "Non-Federal Agency",
      City: "Arizona City",
      "Domain Name": "ACSD-AZ.GOV",
      "Domain Type": "Independent Intrastate",
      Organization: "Arizona City Sanitary District ",
      "Security Contact Email": "(blank)",
      State: "AZ",
    },
    {
      Agency: "Non-Federal Agency",
      City: "Mechanicsburg",
      "Domain Name": "EMSCOMPACT.GOV",
      "Domain Type": "Interstate",
      Organization: "Interstate Commission for EMS Personnel Practice",
      "Security Contact Email": "(blank)",
      State: "PA",
    },
    {
      Agency: "Non-Federal Agency",
      City: "St Croix",
      "Domain Name": "VIVOTE.GOV",
      "Domain Type": "State",
      Organization: "Election System of the Virgin Islands",
      "Security Contact Email": "(blank)",
      State: "VI",
    },
    {
      Agency: "Non-Federal Agency",
      City: "Ada",
      "Domain Name": "CHICKASAW-NSN.GOV",
      "Domain Type": "Tribal",
      Organization: "the Chickasaw Nation",
      "Security Contact Email": "(blank)",
      State: "OK",
    },
  ];
  const commonResponse = {
    icon_emoji: ":dotgov:",
    thread_ts: "thread id",
    unfurl_links: false,
    unfurl_media: false,
    username: ".Gov",
  };

  beforeAll(() => {});

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {});

  it("subscribes to domain requests in two ways", () => {
    script(app);
    expect(app.message).toHaveBeenCalledWith(/git\.gov/i, expect.any(Function));
    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /((?<re_type>(Gov(ernment)?)|(City)|(County)|(Executive(\sBranch)?)|(Judicial(\sBranch)?)|(Legislative(\sBranch)?)|(Fed(eral)?)|((Ind(ependent)?\s)?Intra(state)?)|(Inter(state)?)|(State)|(Trib(e|(al))))\s)?((get\s?)?\.gov)(\s(?<re_search>.+))?/i,
      expect.any(Function)
    );
  });

  describe("response to domain requests", () => {
    let handler;
    beforeEach(() => {
      script(app);
      // general purpose handler, listens to all conversations
      handler = app.getHandler();
    });

    const message = { message: { thread_ts: "thread id" }, say: jest.fn() };

    it("fetches domains from a cache", async () => {
      cache.mockResolvedValue([]);
      await handler(message);
      expect(cache).toHaveBeenCalledWith(
        "dotgov domains",
        1440,
        expect.any(Function)
      );
    });

    describe("gets domains from github if the cache is expired or whatever", () => {
      let fetch;
      beforeEach(async () => {
        cache.mockResolvedValue([]);
        await handler(message);
        fetch = cache.mock.calls[0][2];
      });

      it("if the API throws an error", async () => {
        axios.get.mockRejectedValue("error");
        const out = await fetch();

        expect(out).toEqual([]);
      });

      it("if the API returns a malformed object", async () => {
        axios.get.mockResolvedValue({ data: { data_is_missing: [] } });
        const out = await fetch();

        expect(out).toEqual([]);
      });

      it("if the API doesn't return any domains", async () => {
        axios.get.mockResolvedValue({ data: { data: [] } });
        const out = await fetch();

        expect(out).toEqual([]);
      });

      it("if the API does return some domains", async () => {
        axios.get.mockResolvedValue({
          data: [
            "Domain Name,Domain Type,Agency,Organization,City,State,Security Contact Email",
            "ALBANYCA.GOV,City,Non-Federal Agency,City of Albany,Albany,CA,(blank)",
            "BELLEPLAINEIOWA.GOV,City,Non-Federal Agency,City of Belle Plaine,Belle Plaine,IA,(blank)",
            "RURAL.GOV,Federal - Executive,U.S. Department of Agriculture,Rural Development,Washington,DC,cyber.(blank)",
            "SUPREMECOURTUS.GOV,Federal - Judicial,The Supreme Court,Supreme Court of the United Statest,Washington,DC,(blank)",
            "USCODE.GOV,Federal - Legislative,Government Publishing Office,United States Government Publishing Office,Washington,DC,(blank)",
            "ACSD-AZ.GOV,Independent Intrastate,Non-Federal Agency,Arizona City Sanitary District ,Arizona City,AZ,(blank)",
            "EMSCOMPACT.GOV,Interstate,Non-Federal Agency,Interstate Commission for EMS Personnel Practice,Mechanicsburg,PA,(blank)",
            "VIVOTE.GOV,State,Non-Federal Agency,Election System of the Virgin Islands,St Croix,VI,(blank)",
            "CHICKASAW-NSN.GOV,Tribal,Non-Federal Agency,the Chickasaw Nation,Ada,OK,(blank)",
          ].join("\n"),
        });
        const out = await fetch();

        expect(out).toEqual(mockCache);
      });
    });

    describe("responds with a domain", () => {
      beforeEach(() => {
        axios.head.mockImplementation(() => Promise.resolve("Ok"));
      });

      it("unless there aren't any domains", async () => {
        cache.mockResolvedValue([]);
        await handler(message);
        expect(message.say).not.toHaveBeenCalled();
      });

      it("if there is at least one domain", async () => {
        cache.mockResolvedValue(mockCache);
        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          text: expect.any(String),
          ...commonResponse,
        });

        expect(message.say.mock.calls[0][0].text.split("\n")).toEqual([
          "There are 9 `.gov` domains right now! Have you seen this one?",
          expect.stringMatching(
            /<https:\/\/[\w\d-]+\.GOV\|[\w\d-]+\.GOV> \([^)]+\), presented by _[^_]+_ in _[^_]+_, _[^_]+_/
          ),
        ]);
      });

      it("even if checking the status of the domain fails", async () => {
        axios.head.mockImplementation(() => Promise.reject(new Error()));
        cache.mockResolvedValue(mockCache);
        await handler(message);

        expect(message.say.mock.calls[0][0].text.split("\n")).toEqual([
          "There are 9 `.gov` domains right now! Have you seen this one?",
          expect.stringMatching(
            /<https:\/\/[\w\d-]+\.GOV\|[\w\d-]+\.GOV> \([^)]+\), presented by _[^_]+_ in _[^_]+_, _[^_]+_/
          ),
        ]);
      });
    });
  });

  describe("has correct regex for triggering", () => {
    it("if requesting a domain of a given type", async () => {
      expect("gov .gov").toMatch(script.gitGovRegex);
      expect("government .gov").toMatch(script.gitGovRegex);
      expect("city .gov").toMatch(script.gitGovRegex);
      expect("county .gov").toMatch(script.gitGovRegex);
      expect("executive .gov").toMatch(script.gitGovRegex);
      expect("executive branch .gov").toMatch(script.gitGovRegex);
      expect("judicial .gov").toMatch(script.gitGovRegex);
      expect("judicial branch .gov").toMatch(script.gitGovRegex);
      expect("legislative .gov").toMatch(script.gitGovRegex);
      expect("legislative branch .gov").toMatch(script.gitGovRegex);
      expect("fed .gov").toMatch(script.gitGovRegex);
      expect("federal .gov").toMatch(script.gitGovRegex);
      expect("ind .gov").toMatch(script.gitGovRegex);
      expect("independent .gov").toMatch(script.gitGovRegex);
      expect("ind intra .gov").toMatch(script.gitGovRegex);
      expect("ind intrastate .gov").toMatch(script.gitGovRegex);
      expect("independent intrastate .gov").toMatch(script.gitGovRegex);
      expect("inter .gov").toMatch(script.gitGovRegex);
      expect("interstate .gov").toMatch(script.gitGovRegex);
      expect("state .gov").toMatch(script.gitGovRegex);
      expect("tribe .gov").toMatch(script.gitGovRegex);
      expect("tribal .gov").toMatch(script.gitGovRegex);
    });

    it("if using a variant of .gov", async () => {
      expect(".gov").toMatch(script.gitGovRegex);
      expect("git.gov").toMatch(script.gitGovRegex);
      expect("get.gov").toMatch(script.gitGovRegex);
      expect("git .gov").toMatch(script.gitGovRegex);
      expect("get .gov").toMatch(script.gitGovRegex);
    });

    it("if searching for a specific .gov", async () => {
      expect(".gov abc3234 @#$%@#% ~~!").toMatch(script.gitGovRegex);
      expect("state get.gov pennsylvania").toMatch(script.gitGovRegex);
    });
  });

  describe("response to domain queries", () => {
    let handler;
    beforeEach(() => {
      script(app);
      // special purpose handler, responds only to direct mentions
      handler = app.getHandler(1);
    });

    const message = { message: { thread_ts: "thread id" }, say: jest.fn() };

    describe("responds with results", () => {
      beforeEach(() => {
        axios.head.mockImplementation(() => Promise.resolve("Ok"));
      });

      it("if there aren't any results", async () => {
        cache.mockResolvedValue(mockCache);
        message.context = {
          matches: { groups: { re_type: "state", re_search: "confusion" } },
        };
        await handler(message);
        expect(message.say).toHaveBeenCalledWith({
          text: 'I found nothing related to "confusion", sorry.',
          ...commonResponse,
        });
      });

      it("if there is at least one result", async () => {
        cache.mockResolvedValue(mockCache);
        message.context = {
          matches: { groups: { re_type: "city", re_search: "belle" } },
        };
        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          text: expect.any(String),
          ...commonResponse,
        });

        expect(message.say.mock.calls[0][0].text.split("\n")).toEqual([
          'Here\'s what I could find for city domains related to "belle".',
          expect.stringMatching(/BELLEPLAINEIOWA.GOV/),
        ]);
      });

      it("if there are many results", async () => {
        cache.mockResolvedValue(mockCache);
        message.context = {
          matches: { groups: { re_type: null, re_search: "a" } },
        };
        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          text: expect.any(String),
          ...commonResponse,
        });

        const expected =
          /<https:\/\/[\w\d-]+\.GOV\|[\w\d-]+\.GOV> \([^)]+\), presented by _[^_]+_ in _[^_]+_, _[^_]+_/;
        expect(message.say.mock.calls[0][0].text.split("\n")).toEqual([
          'Here\'s what I could find for domains related to "a".',
          expect.stringMatching(expected),
          expect.stringMatching(expected),
          expect.stringMatching(expected),
          expect.stringMatching(expected),
          expect.stringMatching(expected),
          ". . . plus 4 others.",
        ]);
      });
    });
    describe("filters correctly by entity", () => {
      beforeEach(() => {
        axios.head.mockImplementation(() => Promise.resolve("Ok"));
      });
      it("if entity is executive", async () => {
        cache.mockResolvedValue(mockCache);
        message.context = {
          matches: { groups: { re_type: "executive" } },
        };
        await handler(message);

        expect(message.say.mock.calls[0][0].text.split("\n")).toEqual([
          'There are 1 `.gov` executive domains right now! Have you seen this one?',
          expect.stringMatching(/RURAL.GOV/),
        ]);
      });
      it("if entity is executive branch", async () => {
        cache.mockResolvedValue(mockCache);
        message.context = {
          matches: { groups: { re_type: "executive branch" } },
        };
        await handler(message);

        expect(message.say.mock.calls[0][0].text.split("\n")).toEqual([
          'There are 1 `.gov` executive branch domains right now! Have you seen this one?',
          expect.stringMatching(/RURAL.GOV/),
        ]);
      });
    });
  });
});
