# MAKOM Prize Quiz (JNF-USA Global Conference for Israel 2026)

A static, mobile-first quiz with a giveaway entry form. No framework and no build step. Entries go to a Google Sheet through a Google Apps Script web app. The full spec is in the PRD.

While `endpoint` in `content.js` is empty, the site runs in **demo mode**: the quiz and form work, and an entry is only logged to the browser console.

## Edit the quiz text

1. Open `content.js` on GitHub and click the pencil icon.
2. Change only the text inside the quotes. To move the right answer, reorder the answers and change `correct` (0 = A, 1 = B, 2 = C).
3. If you changed the consent text, increase `consentVersion`.
4. Click **Commit changes**. Netlify redeploys in about a minute.
5. Open the site on your phone and check the change.

## Set up the Google Sheet (once)

1. Create the Google Sheet "MAKOM GC2026 Giveaway Entries" in an organizational Google account, not a personal one. Name its tab `Entries`.
2. Put this header row in row 1 and freeze it: `Received (server time) | Entry ID | Full Name | Email | Phone | Score | Consent | Consent Version | Submitted (device time)`.
3. Open **Extensions > Apps Script**, replace the editor contents with `apps-script/Code.gs`, and save.
4. Optional check: select `testDoPost` and click **Run**. The log should show four `PASS` lines. Delete the test rows from the sheet afterwards.
5. Click **Deploy > New deployment > Web app**. Execute as: **Me**. Who has access: **Anyone**. Copy the URL that ends in `/exec`.
6. Paste that URL into `endpoint` in `content.js` and commit.
7. Share the sheet only with the people who run the draw.

If you change `Code.gs` later, use **Deploy > Manage deployments > Edit > New version**, so the `/exec` URL stays the same. The closing date is in both `content.js` (`entryClosesAt`) and `Code.gs` (`CLOSES_AT`); keep them equal.

## Deploy on Netlify

1. Push this folder to a GitHub repo, for example `makom-gc2026-quiz`.
2. In Netlify: **Add new site > Import an existing project**, pick the repo. Build command: empty. Publish directory: `.` (also set in `netlify.toml`).
3. **Site configuration > Change site name** to `makom-quiz` (or `makom-gc2026` if taken).
4. When files other than `content.js` change, increase `CACHE` in `sw.js` (for example `makom-quiz-v2`) so phones pick up the new version.

## Booth QR sign

After the site name is final, run:

```bash
scripts/make-qr.sh https://makom-quiz.netlify.app
```

It writes `print/qr.svg`, `print/qr.png` and `print/qr-sign-letter.pdf` (US Letter). Print the PDF and test-scan it from about 1 m. Once the sign is printed, the URL must not change.

The logos are regenerated from the source JPEGs with `python3 scripts/process-logos.py <folder with the JPEGs>` (needs Pillow).

## Booth staff: if an entry shows "saved on this phone"

The phone could not reach the internet. The entry is kept on the phone and is sent automatically. Ask the visitor to keep the page open or reopen it later on Wi-Fi or mobile data. If they cannot, write down their name, email and phone and add them to the sheet by hand with Consent Version `manual-booth`.

## Winner draw (Nov 16, 2026)

1. Make a copy of the sheet as a frozen record.
2. Remove test rows and invalid rows.
3. Draw with `=INDEX(D2:D, RANDBETWEEN(1, COUNTA(D2:D)))` or random.org. Record a screenshot or video, the date and time, and a witness.
4. Notify the winner as the Official Rules describe.
5. Delete or anonymize the rows on Feb 14, 2027, keeping the winner's record.

## Tests

```bash
npm install playwright && npx playwright install chromium   # once
node --test tests/quiz.spec.js
```

The tests start their own local server and mock the Apps Script endpoint.

## Before launch

- Counsel approves every `[LEGAL]` text. Put the final text in `content.js` (`finePrint`, `consentLabel`) and `rules.html`, remove the draft notice and yellow highlights from `rules.html`, and change `consentVersion` from `v1-draft` to `v1`.
- Test on a real iPhone (Safari) and Android phone (Chrome): scan the printed sign, finish the quiz, and confirm the row appears in the sheet.
- Airplane-mode test: load the site, turn on airplane mode, submit, turn it off, and confirm the row appears.
- Delete all test rows before the conference opens.
