#!/bin/sh
# Carimba a versao (cache-busting), roda os testes, faz commit e push.
set -e
cd "$(dirname "$0")"
node test/test.js > /dev/null
V=$(date +%Y%m%d%H%M)
sed -i -E "s/(v=|XV = ')[0-9]{12}/\1$V/g" index.html
git add -A
git -c user.name="KT3746" -c user.email="KT3746@users.noreply.github.com" commit -qm "${1:-Melhorias}" 
git push -q origin main
echo "$V"
