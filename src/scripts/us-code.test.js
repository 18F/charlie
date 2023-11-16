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
      expect.any(Function),
    );
  });

  describe("handles messages", () => {
    usc(app);
    const bot = app.getHandler();

    const say = jest.fn();
    const message = {
      context: { matches: [null, 1, null, 2] },
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
          blocks: [],
          text: `1 U.S. Code § 2 not found`,
          thread_ts: "ts",
        });
      });
    });

    describe("for a title and subsection that exists", () => {
      const source = `
      <h1 id="page_title">XX USC YYY - Section Name</h1>
      <div class="tab-pane active">
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
        </div>
      </div>
`;

      const html = [];
      beforeEach(() => {
        html.length = 0;
        html.push(
          ...source
            .trim()
            .split("\n")
            .map((v) => v.trim()),
        );

        axios.get.mockImplementation(async () => ({ data: html.join("") }));
      });

      it("sends the user a message with the title and a button for the full text", async () => {
        await bot(message);

        expect(say).toHaveBeenCalledWith({
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: "*XX USC YYY* - Section Name" },
              accessory: {
                type: "button",
                text: { type: "plain_text", text: "See text" },
                value: "1 2", // this comes from the regex matches derived by Bolt from the message, not the parsed HTML
                action_id: "us code text",
              },
            },
          ],
          text: "XX USC YYY - Section Name",
          thread_ts: "ts",
        });
      });

      describe("and there are parentheticals in the message", () => {
        beforeEach(() => {
          message.message.text = "1 usc 2 (a)(b)";
        });

        it("sets up the button to include subcitations", async () => {
          await bot(message);

          expect(say).toHaveBeenCalledWith({
            blocks: [
              {
                type: "section",
                text: { type: "mrkdwn", text: "*XX USC YYY* - Section Name" },
                accessory: {
                  type: "button",
                  text: { type: "plain_text", text: "See text" },
                  value: "1 2 a b", // this comes from the message, not the parsed HTML
                  action_id: "us code text",
                },
              },
            ],
            text: "XX USC YYY - Section Name",
            thread_ts: "ts",
          });
        });

        describe("and some of them are not part of a citation", () => {
          beforeEach(() => {
            message.message.text = `${message.message.text} and he (Fred) doesn't mind`;
          });

          it("does not include the non-citation bits when setting up the button", async () => {
            await bot(message);

            expect(say).toHaveBeenCalledWith({
              blocks: [
                {
                  type: "section",
                  text: { type: "mrkdwn", text: "*XX USC YYY* - Section Name" },
                  accessory: {
                    type: "button",
                    text: { type: "plain_text", text: "See text" },
                    value: "1 2 a b", // this comes from the message, not the parsed HTML
                    action_id: "us code text",
                  },
                },
              ],
              text: "XX USC YYY - Section Name",
              thread_ts: "ts",
            });
          });
        });
      });

      describe("and the user clicks the 'See text' button", () => {
        const requestModal = app.getActionHandler();

        const request = {
          ack: jest.fn(),
          client: { views: { open: jest.fn() } },
          body: { trigger_id: "trigger id" },
          action: { value: "" },
        };

        const modal = {
          trigger_id: "trigger id",
          view: {
            type: "modal",
            title: {
              type: "plain_text",
              text: "1 U.S. Code § 2",
            },
            blocks: [
              {
                type: "section",
                text: { type: "mrkdwn", text: "*XX USC YYY - Section Name*" },
              },
              {
                type: "context",
                elements: [
                  {
                    type: "mrkdwn",
                    text: "Text sourced from <https://www.law.cornell.edu/uscode/text/1/2|Cornell Legal Information Institute>",
                  },
                ],
              },
            ],
          },
        };

        describe("and the user wants the whole section", () => {
          beforeEach(() => {
            request.action.value = "1 2";
          });

          describe("and the section does not have subsections", () => {
            beforeEach(() => {
              html.splice(4, html.length - 6); // leave closing tags
            });

            describe("and the section does not have its own content", () => {
              it("displays only the section title", async () => {
                html.splice(3, 1);

                await requestModal(request);

                expect(request.client.views.open).toHaveBeenCalledWith(modal);
              });
            });

            describe("and the section has its own content", () => {
              it("displays the section title and top-level text", async () => {
                await requestModal(request);

                modal.view.blocks[0].text.text =
                  "*XX USC YYY - Section Name*\ntop-level content";

                expect(request.client.views.open).toHaveBeenCalledWith(modal);
              });
            });
          });

          describe("and the section does have subsections", () => {
            it("displays the section and all the subsections", async () => {
              await requestModal(request);

              modal.view.blocks[0].text.text = `
*XX USC YYY - Section Name*
top-level content
:blank:*(a)* subsection content
:blank::blank:*(1)* paragraph content
:blank::blank::blank:*(A) Subparagraph Name* subparagraph content
:blank::blank::blank::blank:*(i)*
:blank::blank::blank::blank::blank:*(I)* subclause content
`.trim();

              expect(request.client.views.open).toHaveBeenCalledWith(modal);
            });
          });
        });

        describe("and the user wants a more precise citation", () => {
          describe("and an intermediate part of the citation does not exist", () => {
            beforeEach(() => {
              request.action.value = "1 2 a 1 b i";
            });

            it("displays up to the last part it finds and says the missing part is not found", async () => {
              await requestModal(request);

              modal.view.blocks[0].text.text = `
*XX USC YYY - Section Name*
:blank:*(a)*
:blank::blank:*(1)*
:blank::blank::blank:*(b) not found*
`.trim();
              expect(request.client.views.open).toHaveBeenCalledWith(modal);
            });
          });

          describe("and the intermediate part of the citation exists", () => {
            describe("but the last part does not", () => {
              beforeEach(() => {
                request.action.value = "1 2 a 1 a i 3";
              });

              it("displays up to the last part it finds and says the last part is not found", async () => {
                await requestModal(request);

                modal.view.blocks[0].text.text = `
*XX USC YYY - Section Name*
:blank:*(a)*
:blank::blank:*(1)*
:blank::blank::blank:*(A) Subparagraph Name*
:blank::blank::blank::blank:*(i)*
:blank::blank::blank::blank::blank:*(3) not found*
`.trim();

                expect(request.client.views.open).toHaveBeenCalledWith(modal);
              });
            });

            describe("and the last part does too", () => {
              beforeEach(() => {
                request.action.value = "1 2 a 1 a i i";
              });

              it("displays them all", async () => {
                await requestModal(request);

                modal.view.blocks[0].text.text = `
*XX USC YYY - Section Name*
:blank:*(a)*
:blank::blank:*(1)*
:blank::blank::blank:*(A) Subparagraph Name*
:blank::blank::blank::blank:*(i)*
:blank::blank::blank::blank::blank:*(I)* subclause content
`.trim();

                expect(request.client.views.open).toHaveBeenCalledWith(modal);
              });
            });
          });
        });
      });
    });
  });
});
