#!/usr/bin/env bash
# Regenerate the booth QR code and printable sign from the live URL.
# Usage: scripts/make-qr.sh https://makom-quiz.netlify.app
# Needs Node.js and the `playwright` package with Chromium (for the PDF).
set -euo pipefail
url="${1:?Usage: scripts/make-qr.sh <live URL>}"
cd "$(dirname "$0")/.."

npx --yes qrcode@1.5.4 -t svg -e Q -q 4 -d 0E2D53FF -o print/qr.svg "$url"
npx --yes qrcode@1.5.4 -t png -e Q -q 4 -w 2000 -d 0E2D53FF -o print/qr.png "$url"

# Print the URL on the sign without the https:// prefix.
sed -i.bak -E "s|(<p class=\"url\">)[^<]*(</p>)|\1${url#https://}\2|" print/qr-sign.html && rm print/qr-sign.html.bak

node -e '
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto("file://" + process.cwd() + "/print/qr-sign.html");
  await p.pdf({ path: "print/qr-sign-letter.pdf", format: "Letter", printBackground: true });
  await b.close();
})();'
echo "Wrote print/qr.svg, print/qr.png and print/qr-sign-letter.pdf for $url"
