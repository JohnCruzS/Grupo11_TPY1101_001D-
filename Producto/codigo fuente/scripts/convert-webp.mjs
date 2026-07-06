import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'src', 'assets');

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(png|jpg|jpeg)$/i.test(entry.name)) yield full;
  }
}

let converted = 0;
let savedBytes = 0;

for await (const file of walk(ROOT)) {
  if (file.includes('logo')) continue;

  const dest = file.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  const original = (await stat(file)).size;

  await sharp(file)
    .resize({ width: 900, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(dest);

  const newSize = (await stat(dest)).size;
  const saved = original - newSize;
  savedBytes += saved;
  converted++;
  console.log(
    `✓ ${path.basename(file)} → ${path.basename(dest)}  ` +
    `${(original / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB  (-${(saved / 1024).toFixed(0)}KB)`
  );
}

console.log(`\nTotal: ${converted} imágenes, ahorro total: ${(savedBytes / 1024).toFixed(0)} KB`);
