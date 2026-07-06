const { readdirSync, readFileSync, writeFileSync } = require('fs');
const path = require('path');

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(walk(full));
    else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) files.push(full);
  }
  return files;
}

const dirs = ['src/app/pages', 'src/app/components'];
let changed = 0;
for (const d of dirs) {
  for (const f of walk(d)) {
    const original = readFileSync(f, 'utf8');
    const updated = original.replace(/assets\/services\/([a-z0-9-]+)\.png/g, 'assets/services/$1.webp');
    if (updated !== original) {
      writeFileSync(f, updated, 'utf8');
      console.log('Updated:', path.relative(process.cwd(), f));
      changed++;
    }
  }
}
console.log('Total files updated:', changed);
