// Smoke tests (PRD 12.1). Run with: node --test tests/quiz.spec.js
// Needs the `playwright` package and a Chromium browser (npx playwright install chromium).
const { test, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const ENDPOINT = "https://script.google.com/macros/s/TEST/exec";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2" };
const contentSrc = fs.readFileSync(path.join(ROOT, "content.js"), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(contentSrc, sandbox);
const QUIZ = sandbox.window.QUIZ;

let server, browser, page, base;

before(async () => {
  server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  }).listen(0);
  base = `http://localhost:${server.address().port}/`;
  browser = await chromium.launch();
});
after(async () => { await browser.close(); server.close(); });
beforeEach(async () => { page = await browser.newPage({ viewport: { width: 375, height: 667 } }); });
afterEach(async () => { await page.close(); });

// Serve content.js with some settings changed.
async function withSettings(settings) {
  let src = contentSrc;
  for (const [k, v] of Object.entries(settings)) src = src.replace(new RegExp(`${k}: "[^"]*"`), `${k}: ${JSON.stringify(v)}`);
  await page.route("**/content.js", r => r.fulfill({ contentType: "text/javascript", body: src }));
}

// Answer every question with the given picks (answer indexes), ending on the result screen.
async function play(picks) {
  await page.click("#start");
  for (const p of picks) {
    await page.locator(".answer").nth(p).click();
    await page.click("#next");
  }
}
const correctPicks = () => QUIZ.questions.map(q => q.correct);
const wrongOf = q => (q.correct + 1) % 3;

async function fillForm() {
  await page.fill("#f-name", "Dana Cohen");
  await page.fill("#f-email", "dana@example.com");
  await page.fill("#f-phone", "+1 (555) 123-4567");
  await page.check("#f-consent");
}

test("full path: feedback, facts, progress and score", async () => {
  await page.goto(base);
  await page.click("#start");
  assert.equal(await page.textContent("#q-progress-label"), "Question 1 of 5");

  const q = QUIZ.questions;
  await page.locator(".answer").nth(q[0].correct).click();
  assert.equal((await page.textContent("#q-banner")).trim(), "Correct!");
  assert.match(await page.locator(".answer").nth(q[0].correct).getAttribute("class"), /right/);
  assert.equal(await page.textContent("#q-fact"), q[0].fact);
  await page.click("#next");

  assert.equal(await page.textContent("#q-progress-label"), "Question 2 of 5");
  await page.locator(".answer").nth(wrongOf(q[1])).click();
  assert.equal((await page.textContent("#q-banner")).trim(), `Not quite. The correct answer is ${"ABC"[q[1].correct]}.`);
  const right = page.locator(".answer").nth(q[1].correct);
  assert.match(await right.getAttribute("class"), /right/);
  assert.equal(await right.locator("use").getAttribute("href"), "#i-check");
  assert.match(await page.locator(".answer").nth(wrongOf(q[1])).getAttribute("class"), /wrong/);
  assert.equal(await page.locator(".answer").nth(wrongOf(q[1])).getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator(".answer:disabled").count(), 3);
  assert.equal(await page.textContent("#q-fact"), q[1].fact);
  await page.click("#next");

  for (let i = 2; i < 5; i++) {
    await page.locator(".answer").nth(q[i].correct).click();
    if (i === 4) assert.equal((await page.textContent("#next")).trim(), "See my score");
    await page.click("#next");
  }
  assert.equal(await page.textContent("#score-line"), "You scored 4 out of 5");
});

test("validation: empty form shows four errors and focuses name; bad email and short phone are blocked", async () => {
  await page.goto(base);
  await play(correctPicks());
  await page.click("#submit");
  assert.equal(await page.locator(".field .error:not([hidden])").count(), 4);
  assert.equal(await page.evaluate(() => document.activeElement.id), "f-name");

  await fillForm();
  await page.fill("#f-email", "not-an-email");
  await page.fill("#f-phone", "123 45");
  await page.click("#submit");
  assert.equal(await page.isVisible("#e-email"), true);
  assert.equal(await page.isVisible("#e-phone"), true);
  assert.equal(await page.isVisible("#result"), true);
});

test("submit ok: thank-you screen and a complete request body", async () => {
  await withSettings({ endpoint: ENDPOINT });
  let body;
  await page.route(ENDPOINT, r => { body = JSON.parse(r.request().postData()); r.fulfill({ contentType: "application/json", body: '{"status":"ok"}' }); });
  await page.goto(base);
  await play(correctPicks());
  await fillForm();
  await page.click("#submit");
  await page.waitForSelector("#thanks:not([hidden])");
  assert.equal(await page.textContent("#draw-note"), QUIZ.thanks.drawNote);
  assert.deepEqual(Object.keys(body).sort(), ["consent", "consentVersion", "email", "id", "name", "phone", "score", "submittedAt", "website"]);
  assert.equal(body.consent, true);
  assert.equal(body.score, 5);
  assert.match(body.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(await page.evaluate(() => sessionStorage.getItem("makomQuiz.state")), null);
});

test("duplicate: shows the already-entered line", async () => {
  await withSettings({ endpoint: ENDPOINT });
  await page.route(ENDPOINT, r => r.fulfill({ contentType: "application/json", body: '{"status":"duplicate"}' }));
  await page.goto(base);
  await play(correctPicks());
  await fillForm();
  await page.click("#submit");
  await page.waitForSelector("#thanks:not([hidden])");
  assert.equal(await page.textContent("#draw-note"), "You're already entered. There is one entry per person. Good luck!");
});

test("offline queue: entry is kept, then sent when back online", async () => {
  await withSettings({ endpoint: ENDPOINT });
  await page.route(ENDPOINT, r => r.abort());
  await page.goto(base);
  await play(correctPicks());
  await fillForm();
  await page.click("#submit");
  await page.waitForSelector("#thanks:not([hidden])");
  assert.equal(await page.textContent("#pending"), QUIZ.thanks.pendingNote);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("makomQuiz.queue")).length), 1);

  await page.unroute(ENDPOINT);
  await page.route(ENDPOINT, r => r.fulfill({ contentType: "application/json", body: '{"status":"ok"}' }));
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForFunction(() => document.getElementById("pending").textContent === "Your entry has been sent.");
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("makomQuiz.queue")).length), 0);
});

test("closed: the form is replaced by the closed message", async () => {
  await withSettings({ entryClosesAt: "2020-01-01T00:00:00Z" });
  await page.goto(base);
  await play(correctPicks());
  assert.equal(await page.isVisible("#entry"), false);
  assert.equal(await page.isVisible("#closed"), true);
  assert.equal((await page.textContent("#closed .closed-msg")).trim(), QUIZ.result.closedMessage);
  assert.equal(await page.isVisible("#discover"), true);
});

test("reload resume: stays on Q3 with earlier answers kept", async () => {
  await page.goto(base);
  await page.click("#start");
  for (let i = 0; i < 2; i++) { await page.locator(".answer").nth(QUIZ.questions[i].correct).click(); await page.click("#next"); }
  await page.reload();
  assert.equal(await page.textContent("#q-progress-label"), "Question 3 of 5");
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("makomQuiz.state")).answers);
  assert.deepEqual(saved, [QUIZ.questions[0].correct, QUIZ.questions[1].correct]);
});

test("content check: every question has 3 answers and a valid correct index", () => {
  assert.equal(QUIZ.questions.length, 5);
  for (const q of QUIZ.questions) {
    assert.equal(q.answers.length, 3);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 3);
  }
});
