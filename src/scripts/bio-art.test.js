const {
  getApp,
  utils: {
    cache,
    slack: { postFile, postMessage },
  },
} = require("../utils/test");

const script = require("./bio-art");

describe("bio-art", () => {
  const app = getApp();
  const requestMessage = {
    message: { channel: "channel", thread_ts: "thread" },
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("initialization", () => {
    it("subscribes to messages", async () => {
      await script(app);

      expect(app.message).toHaveBeenCalledWith(
        expect.any(RegExp),
        expect.any(Function),
      );
    });

    describe("hears correct messages", () => {
      let regex;
      beforeAll(async () => {
        await script(app);
        regex = app.message.mock.calls[0][0];
      });

      it("is case-insensitive", async () => {
        expect(regex.test("BIO ART")).toBe(true);
        expect(regex.test("bio ART")).toBe(true);
        expect(regex.test("BIO art")).toBe(true);
      });

      it("accepts a dash with no space", async () => {
        expect(regex.test("bio-art")).toBe(true);
      });

      it("accepts a space with no dash", async () => {
        expect(regex.test("bio art")).toBe(true);
      });

      it("does not accept anything else between 'bio' and 'art'", async () => {
        expect(regex.test("bio- art")).toBe(false);
        expect(regex.test("bio -art")).toBe(false);
        expect(regex.test("bio - art")).toBe(false);
        expect(regex.test("bio- -art")).toBe(false);
        expect(regex.test("bio.art")).toBe(false);
      });
    });
  });

  describe("responds to requests for art", () => {
    let handler;

    const expectedHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0",
    };

    const random = jest.spyOn(global.Math, "random");

    beforeEach(async () => {
      await script(app);
      handler = app.getHandler();

      cache.mockImplementation(async (name) => {
        switch (name) {
          case "bio-art ontology id":
            return ["one", "two", "three"];
          case "bio-art entities [one,two,three]":
            return [
              {
                id: [1],
                title: ["An art"],
                creator: ["Zeus"],
                filesinfo: ["svg:bob|bmp:george|PNG:image1a,image1b,image1c"],
              },
              {
                id: [2],
                title: ["Some art"],
                creator: ["Persephone"],
                filesinfo: ["svg:bob|bmp:george|PNG:image2a,image2b,image2c"],
              },
              {
                id: [3],
                title: ["The art"],
                creator: ["Athena"],
                filesinfo: ["svg:bob|bmp:george|PNG:image3a,image3b,image3c"],
              },
            ];
          default:
            throw new Error(`unmocked cache key: ${name}`);
        }
      });

      fetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
      });

      random.mockReturnValue(0);
    });

    afterAll(() => {
      random.mockRestore();
    });

    describe("if there are errors", () => {
      it("fails to fetch an image", async () => {
        fetch.mockRejectedValue("this is the error");

        await handler(requestMessage);

        expect(postMessage).toHaveBeenCalledWith({
          channel: "channel",
          thread_ts: "thread",
          text: "There was a problem fetching BioArt.",
        });
        expect(app.logger.error).toHaveBeenCalledWith("this is the error");
      });
    });

    describe("if there are no errors", () => {
      describe("populates caches correctly", () => {
        it("fetches a list of permitted ontology IDs", async () => {
          await handler(requestMessage);

          const populator = cache.mock.calls
            .find(([key]) => key === "bio-art ontology id")
            .pop();

          fetch.mockResolvedValue({
            json: jest.fn().mockResolvedValue([
              { ontologyKey: "bad", ontologyId: 1 },
              { ontologyKey: "fungi", ontologyId: 2 },
              { ontologyKey: "plants", ontologyId: 3 },
              { ontologyKey: "bad", ontologyId: 4 },
            ]),
          });

          const ids = await populator();

          expect(ids).toEqual([2, 3]);
          expect(fetch).toHaveBeenCalledWith(
            "https://bioart.niaid.nih.gov/api/ontologies?type=Bioart%20Category",
            { headers: expectedHeaders },
          );
        });

        describe("fetches a list of entities for a set of ontology IDs", () => {
          it("if there is only one page of results", async () => {
            await handler(requestMessage);

            const populator = cache.mock.calls
              .find(([key]) => key.startsWith("bio-art entities"))
              .pop();

            fetch.mockResolvedValue({
              json: jest.fn().mockResolvedValue({
                hits: { found: 1, hit: [{ fields: 1 }] },
              }),
            });

            const entities = await populator();

            expect(entities).toEqual([1]);

            // NOTE: The cache callback function captures the list of ontology
            // IDs when the cache key is created, so the URL here is built based
            // on the ontology IDs returned by the mocked cache in the "responds
            // to requests for art" describe block above.
            expect(fetch).toHaveBeenCalledWith(
              `https://bioart.niaid.nih.gov/api/search/type:bioart%20AND%20license:%22Public%20Domain%22%20AND%20ontologyid:((one%20OR%20two%20OR%20three))?size=100`,
              {
                headers: expectedHeaders,
              },
            );
          });

          it("if there are several pages of results", async () => {
            await handler(requestMessage);

            const populator = cache.mock.calls
              .find(([key]) => key.startsWith("bio-art entities"))
              .pop();

            let fetchCallCount = 0;
            fetch.mockImplementation(async () => {
              fetchCallCount += 1;
              switch (fetchCallCount) {
                case 1:
                  return {
                    json: jest.fn().mockResolvedValue({
                      hits: {
                        found: 250,
                        hit: [...Array(100)].map((_, i) => ({ fields: i })),
                      },
                    }),
                  };

                case 2:
                  return {
                    json: jest.fn().mockResolvedValue({
                      hits: {
                        found: 250,
                        hit: [...Array(100)].map((_, i) => ({
                          fields: 100 + i,
                        })),
                      },
                    }),
                  };

                case 3:
                  return {
                    json: jest.fn().mockResolvedValue({
                      hits: {
                        found: 250,
                        hit: [...Array(50)].map((_, i) => ({
                          fields: 200 + i,
                        })),
                      },
                    }),
                  };

                default:
                  throw new Error(
                    `unmocked fetch call count: ${fetchCallCount}`,
                  );
              }
            });

            const entities = await populator();

            expect(entities).toEqual([...Array(250)].map((_, i) => i));

            // NOTE: The cache callback function captures the list of ontology
            // IDs when the cache key is created, so the URL here is built based
            // on the ontology IDs returned by the mocked cache in the "responds
            // to requests for art" describe block above.
            expect(fetch).toHaveBeenCalledWith(
              `https://bioart.niaid.nih.gov/api/search/type:bioart%20AND%20license:%22Public%20Domain%22%20AND%20ontologyid:((one%20OR%20two%20OR%20three))?size=100`,
              {
                headers: expectedHeaders,
              },
            );
            expect(fetch).toHaveBeenCalledWith(
              `https://bioart.niaid.nih.gov/api/search/type:bioart%20AND%20license:%22Public%20Domain%22%20AND%20ontologyid:((one%20OR%20two%20OR%20three))?size=100&start=100`,
              {
                headers: expectedHeaders,
              },
            );
            expect(fetch).toHaveBeenCalledWith(
              `https://bioart.niaid.nih.gov/api/search/type:bioart%20AND%20license:%22Public%20Domain%22%20AND%20ontologyid:((one%20OR%20two%20OR%20three))?size=100&start=200`,
              {
                headers: expectedHeaders,
              },
            );
          });
        });
      });

      it("responds with some art", async () => {
        random.mockReturnValue(0);

        await handler(requestMessage);

        // We fetch the correct file
        expect(fetch).toHaveBeenCalledWith(
          `https://bioart.niaid.nih.gov/api/bioarts/1/zip?file-ids=image1c`,
          { headers: expectedHeaders },
        );

        // And we post it to Slack
        expect(postFile).toHaveBeenCalledWith({
          channel_id: "channel",
          thread_ts: "thread",
          initial_comment: "An art (art by Zeus)",
          file_uploads: [
            {
              file: expect.any(Buffer),
              filename: "an art.png",
              alt_text: "An art",
            },
          ],
        });
      });
    });
  });
});
