const { getApp, axios } = require("../utils/test");

const usc = require("./us-code");

describe("U.S. Code bot", () => {
  const app = getApp();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("registers a handler", () => {
    usc(app);
    expect(app.message).toHaveBeenCalledWith(
      expect.any(RegExp),
      expect.any(Function)
    );
  });

  describe("handles messages", () => {
    usc(app);
    const bot = app.getHandler();

    const say = jest.fn();
    const message = {
      context: { matches: [null, 1, 2] },
      event: { ts: "ts" },
      message: { text: "" },
      say,
    };

    beforeEach(() => {
      message.message.text = "";
    });

    describe("if there is any kind of unexpected error", () => {
      beforeEach(() => {
        axios.get.mockRejectedValue({});
      });

      it("does not say anything", async () => {
        await bot(message);
        expect(say).not.toHaveBeenCalled();
      });
    });

    describe("for a title or subsection that does not exist", () => {
      beforeEach(() => {
        axios.get.mockRejectedValue({ response: { status: 404 } });
      });

      it("tells us it doesn't exist", async () => {
        await bot(message);

        expect(say).toHaveBeenCalledWith({
          text: `1 U.S. Code § 2 not found`,
          thread_ts: "ts",
        });
      });
    });

    describe("for a title and subsection that exists", () => {
      const source = `
      <h1 id="page_title">USC Section Name</h1>
      <div class="section">
        <div class="content">top-level content</div>
        <div class="subsection">
          <span class="num">(a)</span>
          <div class="content">subsection content</div>
          <div class="paragraph">
            <span class="num">(1)</span>
            <div class="content">paragraph content</div>
            <div class="subparagraph">
              <span class="num">(A)</span>
              <span class="heading">Subparagraph Name</span>
              <div class="content">subparagraph content</div>
              <div class="clause">
                  <span class="num">(i)</span>
                  <div class="subclause">
                    <span class="num">(I)</span>
                    <div class="content">subclause content</div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div class="section">
`;

      const html = [];
      beforeEach(() => {
        html.length = 0;
        html.push(
          ...source
            .trim()
            .split("\n")
            .map((v) => v.trim())
        );

        axios.get.mockImplementation(async () => ({ data: html.join("") }));
      });

      describe("and the user wants the whole section", () => {
        describe("and the section does not have subsections", () => {
          beforeEach(() => {
            html.splice(3, html.length - 3);
          });

          describe("and the section does not have its own content", () => {
            it("displays only the section title", async () => {
              html.splice(2, 1);
              await bot(message);

              expect(say).toHaveBeenCalledWith({
                text: "*USC Section Name*",
                thread_ts: "ts",
              });
            });
          });

          describe("and the section has its own content", () => {
            it("displays the section title and top-level text", async () => {
              await bot(message);

              expect(say).toHaveBeenCalledWith({
                text: "*USC Section Name*\ntop-level content",
                thread_ts: "ts",
              });
            });
          });
        });

        describe("and the section does have subsections", () => {
          it("displays the section and all the subsections", async () => {
            await bot(message);

            expect(say).toHaveBeenCalledWith({
              text: `
*USC Section Name*
top-level content
:blank:*(a)* subsection content
:blank::blank:*(1)* paragraph content
:blank::blank::blank:*(A) Subparagraph Name* subparagraph content
:blank::blank::blank::blank:*(i)*
:blank::blank::blank::blank::blank:*(I)* subclause content
`.trim(),
              thread_ts: "ts",
            });
          });
        });
      });

      describe("and the user wants a more precise citation", () => {
        describe("and an intermediate part of the citation does not exist", () => {
          beforeEach(() => {
            message.message.text = "1 usc 2 (a)(1)(B)(i)";
          });

          it("displays up to the last part it finds and says the missing part is not found", async () => {
            await bot(message);

            expect(say).toHaveBeenCalledWith({
              text: `
*USC Section Name*
:blank:*(a)*
:blank::blank:*(1)*
:blank::blank::blank:*(b) not found*
`.trim(),
              thread_ts: "ts",
            });
          });
        });

        describe("and the intermediate part of the citation exists", () => {
          describe("but the last part does not", () => {
            beforeEach(() => {
              message.message.text = "1 usc 2 (a)(1)(A)(i)(3)";
            });

            it("displays up to the last part it finds and says the last part is not found", async () => {
              await bot(message);

              expect(say).toHaveBeenCalledWith({
                text: `
*USC Section Name*
:blank:*(a)*
:blank::blank:*(1)*
:blank::blank::blank:*(A) Subparagraph Name*
:blank::blank::blank::blank:*(i)*
:blank::blank::blank::blank::blank:*(3) not found*
`.trim(),
                thread_ts: "ts",
              });
            });
          });

          describe("and the last part does too", () => {
            beforeEach(() => {
              message.message.text = "1 usc 2 (a)(1)(A)(i)(I)";
            });

            it("displays them all", async () => {
              await bot(message);

              expect(say).toHaveBeenCalledWith({
                text: `
*USC Section Name*
:blank:*(a)*
:blank::blank:*(1)*
:blank::blank::blank:*(A) Subparagraph Name*
:blank::blank::blank::blank:*(i)*
:blank::blank::blank::blank::blank:*(I)* subclause content
`.trim(),
                thread_ts: "ts",
              });
            });
          });
        });
      });
    });
  });
});
