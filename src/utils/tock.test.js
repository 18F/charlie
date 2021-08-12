const axios = require("axios");
const sinon = require("sinon");
const slack = require("./slack");

describe("utils / tock", () => {
  let getCurrent18FTockUsers;
  let get18FTockSlackUsers;
  let get18FTockTruants;

  const create = sinon.stub(axios, "create");

  const sandbox = sinon.createSandbox();
  const http = {
    get: sandbox.stub(),
  };

  const getSlackUsers = sandbox.stub(slack, "getSlackUsers");

  beforeAll(() => {
    process.env.TOCK_API = "tock api";
    process.env.TOCK_TOKEN = "tock token";

    create.returns(http);

    const tock = require("./tock"); // eslint-disable-line global-require
    getCurrent18FTockUsers = tock.getCurrent18FTockUsers;
    get18FTockSlackUsers = tock.get18FTockSlackUsers;
    get18FTockTruants = tock.get18FTockTruants;
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();

    getSlackUsers.resolves([
      {
        deleted: false,
        id: "slack 1",
        is_bot: false,
        is_restricted: false,
        profile: { email: "email 1" },
        real_name: "user 1",
        tz: "timezone 1",
      },
      {
        deleted: false,
        id: "slack 2",
        is_bot: false,
        is_restricted: true,
        profile: { email: "email 2" },
        real_name: "user 2",
        tz: "timezone 2",
      },
      {
        deleted: false,
        id: "slack 3",
        is_bot: true,
        is_restricted: false,
        profile: { email: "email 3" },
        real_name: "user 3",
        tz: "timezone 3",
      },
      {
        deleted: true,
        id: "slack 4",
        is_bot: false,
        is_restricted: false,
        profile: { email: "email 4" },
        real_name: "user 4",
        tz: "timezone 4",
      },
      {
        deleted: false,
        id: "slack 5",
        is_bot: false,
        is_restricted: false,
        profile: { email: "email 5" },
        real_name: "user 5",
        tz: "timezone 5",
      },
    ]);

    http.get.withArgs("/user_data.json").resolves({
      data: [
        {
          is_18f_employee: true,
          is_active: true,
          current_employee: true,
          user: "user 1",
        },
        {
          is_18f_employee: false,
          is_active: true,
          current_employee: true,
          user: "user 2",
        },
        {
          is_18f_employee: true,
          is_active: false,
          current_employee: true,
          user: "user 3",
        },
        {
          is_18f_employee: true,
          is_active: true,
          current_employee: false,
          user: "user 4",
        },
        {
          is_18f_employee: true,
          is_active: true,
          current_employee: true,
          user: "user 5",
        },
      ],
    });

    http.get.withArgs("/users.json").resolves({
      data: [
        { email: "email 1", id: 1, username: "user 1" },
        { email: "email 2", id: 2, username: "user 2" },
        { email: "email 3", id: 3, username: "user 3" },
        { email: "email 4", id: 4, username: "user 4" },
        { email: "email 5", id: 5, username: "user 5" },
      ],
    });

    http.get.withArgs("/reporting_period_audit/2020-10-04.json").resolves({
      data: [
        {
          id: 1,
          username: "user 1",
          email: "email 1",
        },
      ],
    });

    http.get.withArgs("/reporting_period_audit/2020-10-11.json").resolves({
      data: [
        {
          id: 5,
          username: "user 5",
          email: "email 5",
        },
      ],
    });

    http.get.rejects("unmocked url");
  });

  it("sets up the default Axios client correctly", () => {
    expect(
      create.calledWith({
        baseURL: "tock api",
        headers: { Authorization: "Token tock token" },
      })
    ).toBe(true);
  });

  it("gets a list of current 18F Tock users", async () => {
    const users = await getCurrent18FTockUsers();

    expect(users).toEqual([
      { user: "user 1", email: "email 1", tock_id: 1 },
      { user: "user 5", email: "email 5", tock_id: 5 },
    ]);
  });

  it("gets a list of 18F Tock users and their associated Slack details", async () => {
    const users = await get18FTockSlackUsers();

    expect(users).toEqual([
      {
        email: "email 1",
        name: "user 1",
        slack_id: "slack 1",
        tock_id: 1,
        user: "user 1",
        tz: "timezone 1",
      },
      {
        email: "email 5",
        name: "user 5",
        slack_id: "slack 5",
        tock_id: 5,
        user: "user 5",
        tz: "timezone 5",
      },
    ]);
  });

  describe("gets a list of 18F Tock users who are truant", () => {
    let clock;

    beforeAll(() => {
      clock = sinon.useFakeTimers();
    });

    afterAll(() => {
      clock.restore();
    });

    it("defaults to looking at the reporting period from a week ago", async () => {
      const date = Temporal.PlainDate.from("2020-10-14");
      clock.tick(
        Date.parse(
          date
            .toZonedDateTime({ timeZone: Temporal.Now.timeZone() })
            .toInstant()
        )
      );
      const truants = await get18FTockTruants(date);

      // Only user 1 is truant from the previous period.
      expect(truants).toEqual([
        { id: 1, email: "email 1", username: "user 1" },
      ]);
    });

    it("defaults to looking at the reporting period from this week", async () => {
      const date = Temporal.PlainDate.from("2020-10-14");
      clock.tick(
        Date.parse(
          date
            .toZonedDateTime({ timeZone: Temporal.Now.timeZone() })
            .toInstant()
        )
      );
      const truants = await get18FTockTruants(date, 0);

      // Only user 5 is truant in the current period.
      expect(truants).toEqual([
        { id: 5, email: "email 5", username: "user 5" },
      ]);
    });
  });
});
