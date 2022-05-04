#!/bin/bash
set -e
set -u

# qrcode-svg.min.js
# /sha2-abc123/qrcode.min.js
# /qrcode.sha2-abc123.min.js
# /qrcode.min.js?sha2=abc123
curl -Lo vendor/qrcode-svg.min.js https://unpkg.com/qrcode-svg@1.1.0/dist/qrcode.min.js
