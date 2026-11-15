const assert = require("node:assert/strict");
const test = require("node:test");

test("Vercel root entrypoint exports an Express app without starting the local server", () => {
  const app = require("../index");

  assert.equal(typeof app, "function");
  assert.equal(typeof app.handle, "function");
});
