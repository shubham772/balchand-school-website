const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { fields } = require("../server/content-schema");

const root = path.resolve(__dirname, "..");
const publicPages = [
  "index.html",
  "about.html",
  "academics.html",
  "admissions.html",
  "faculty.html",
  "gallery.html",
  "news-events.html",
  "contact.html",
];
const html = publicPages.map(file => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
const sharedScript = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8");

test("all editable CMS fields are connected to public page content", () => {
  const missing = fields
    .map(([key]) => key)
    .filter(key => !html.includes(`data-cms="${key}"`)
      && !html.includes(`data-cms-attr="${key}:`)
      && !sharedScript.includes(`"${key}"`));
  assert.deepEqual(missing, []);
});

test("every public page loads the CMS integration script", () => {
  for (const file of publicPages) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    assert.match(source, /assets\/js\/cms\.js/, `${file} should load cms.js`);
  }
});

test("public pages contain no unfinished setup placeholders", () => {
  assert.doesNotMatch(html, /\[(?:ADD|CONFIRM)\b/i);
});
