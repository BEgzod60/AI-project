#!/usr/bin/env bash
set -e

# Cloudflared orqali loyihani internetga (boshqa noutbuk, telefon va hk) chiqarish
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN="$DIR/bin/cloudflared"

if [ ! -f "$BIN" ]; then
    echo "cloudflared yuklab olinmoqda..."
    mkdir -p "$DIR/bin"
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o "$BIN"
    chmod +x "$BIN"
fi

echo "=========================================================="
echo " Cloudflare Tunnel ishga tushirilmoqda..."
echo " Loyihangiz internet orqali xavfsiz (HTTPS) ochiladi."
echo "=========================================================="

"$BIN" tunnel --url http://127.0.0.1:8090 --http-host-header maningiymonim.uz
