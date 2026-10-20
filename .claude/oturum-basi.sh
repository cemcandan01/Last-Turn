#!/bin/bash
# Oturum başı: bağımlılıklar yoksa kur (bulut oturumları temiz bir kopyayla başlar)
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
if [ -f package.json ] && [ ! -d node_modules ]; then
  npm ci --silent --no-audit --no-fund > /dev/null 2>&1 && echo "Bağımlılıklar kuruldu (npm ci)."
fi
exit 0
