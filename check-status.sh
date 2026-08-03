#!/bin/bash
echo "--- Cek NS ---"
dig @8.8.8.8 NS feryshop.com +short
echo "--- Cek Port 25 Outbound ---"
timeout 5 bash -c "echo > /dev/tcp/gmail-smtp-in.l.google.com/25" && echo "TERBUKA" || echo "MASIH TERTUTUP"
