const SHEET = 'Entries';
const CLOSES_AT = new Date('2026-11-16T07:59:59Z'); // Nov 15, 2026, 11:59:59 PM PST. Keep in sync with content.js

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // serialize writes so the duplicate check below is reliable
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.website) return out({ status: 'ok' });                  // honeypot: pretend success
    if (new Date() > CLOSES_AT) return out({ status: 'closed' });

    const name = clean(d.name, 100);
    const email = clean(d.email, 254).toLowerCase();
    const phone = clean(d.phone, 30);
    const digits = phone.replace(/\D/g, '').length;
    const score = Number(d.score);
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        digits < 7 || digits > 15 || d.consent !== true ||
        !Number.isInteger(score) || score < 0 || score > 5) {
      return out({ status: 'invalid' });
    }

    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const last = sh.getLastRow();
    if (last > 1) {
      const emails = sh.getRange(2, 4, last - 1, 1).getValues().flat().map(String);
      // one entry per email; this also makes offline retries of the same entry safe
      if (emails.some(v => v.replace(/^'/, '').toLowerCase() === email)) return out({ status: 'duplicate' });
    }

    sh.appendRow([new Date(), safe(clean(d.id, 64)), safe(name), safe(email), safe(phone),
                  score, true, safe(clean(d.consentVersion, 20)), safe(clean(d.submittedAt, 40))]);
    return out({ status: 'ok' });
  } catch (err) {
    return out({ status: 'error' });
  } finally {
    lock.releaseLock();
  }
}

function clean(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }
// Stop spreadsheet formula injection: values that start with = + - @ are stored as text
function safe(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }
function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Run once from the Apps Script editor (select testDoPost, then Run) and read the log. Delete the test rows afterwards.
// Note: it only passes before CLOSES_AT.
function testDoPost() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET);
  const post = d => JSON.parse(doPost({ postData: { contents: JSON.stringify(d) } }).getContent()).status;
  const email = 'test+' + Date.now() + '@example.com';
  const entry = { id: 'test', name: 'Test Entry', email: email, phone: '+1 555 123 4567', score: 3,
                  consent: true, consentVersion: 'test', submittedAt: new Date().toISOString(), website: '' };
  const check = (label, ok) => Logger.log((ok ? 'PASS ' : 'FAIL ') + label);

  let rows = sh.getLastRow();
  check('valid entry appends a row', post(entry) === 'ok' && sh.getLastRow() === rows + 1);
  check('same email (other case) returns duplicate', post(Object.assign({}, entry, { email: email.toUpperCase() })) === 'duplicate');

  const formula = '=HYPERLINK("http://example.com","x")';
  post(Object.assign({}, entry, { name: formula, email: 'f' + email }));
  const cell = sh.getRange(sh.getLastRow(), 3);
  check('formula is stored as text', cell.getFormula() === '' && cell.getValue() === formula);

  rows = sh.getLastRow();
  check('honeypot appends nothing', post(Object.assign({}, entry, { email: 'h' + email, website: 'spam' })) === 'ok' && sh.getLastRow() === rows);
}
