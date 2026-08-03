#!/bin/bash
# Auto-Purge FerryMail — hapus email > 7 hari dari seluruh mailbox feryshop.com
# Referensi: prd-imap-worker.md Bab 3.4 · Dipanggil /etc/cron.d/ferrymail-purge jam 03:00
#
# Daftar mailbox diambil dinamis dari cPanel UAPI supaya mailbox baru yang dibuat
# admin ikut ter-purge tanpa perlu menyentuh script ini lagi.

set -uo pipefail

LOG_FILE="/var/log/ferrymail-purge.log"
CPANEL_USER="feryshop"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"; }

log "Starting auto-purge..."

# Output YAML uapi berbentuk "      email: akun001@feryshop.com" (indentasi 6 spasi),
# BUKAN "- email:" seperti asumsi parser lama — itu sebabnya list selalu kosong dan
# script diam-diam jatuh ke fallback hardcode. Filter "@" membuang entri akun utama
# cPanel ("email: feryshop") yang bukan mailbox virtual.
MAILBOXES=$(/usr/local/cpanel/bin/uapi --user="$CPANEL_USER" Email list_pops 2>>"$LOG_FILE" \
  | awk '/^[[:space:]]+email:[[:space:]]+.+@/ {print $2}' | sort -u)

# Berhenti daripada menebak. Purge dengan daftar tebakan berisiko dua arah:
# mailbox yang tidak masuk daftar jadi menumpuk, dan salah nama = expunge sia-sia.
if [ -z "$MAILBOXES" ]; then
  log "ERROR: UAPI list_pops tidak mengembalikan satu pun mailbox. Purge dibatalkan."
  exit 1
fi

log "Mailbox terdeteksi: $(echo "$MAILBOXES" | tr '\n' ' ')"

TOTAL=0
FAILED=0
for MB in $MAILBOXES; do
  # savedbefore (bukan before) memakai tanggal email masuk ke Maildir, bukan header Date
  # yang dikirim platform game — header itu bisa salah dan menghapus OTP yang masih baru.
  COUNT=$(doveadm search -u "$MB" mailbox INBOX savedbefore 7d 2>>"$LOG_FILE" | wc -l)
  if [ "$COUNT" -gt 0 ]; then
    if doveadm expunge -u "$MB" mailbox INBOX savedbefore 7d >> "$LOG_FILE" 2>&1; then
      log "  $MB: $COUNT email dihapus"
      TOTAL=$((TOTAL + COUNT))
    else
      log "  $MB: GAGAL expunge"
      FAILED=$((FAILED + 1))
    fi
  else
    log "  $MB: tidak ada email > 7 hari"
  fi
done

log "Selesai. Total dihapus: $TOTAL, gagal: $FAILED"
log "Disk mail: $(du -sh /home/feryshop/mail/ 2>/dev/null | cut -f1)"
