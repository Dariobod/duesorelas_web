import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
const imageDir = join(process.cwd(), 'data', 'imagenes');

if (!cloudName || !uploadPreset) {
  throw new Error('Definí CLOUDINARY_CLOUD_NAME y CLOUDINARY_UPLOAD_PRESET antes de ejecutar.');
}

const files = (await readFile(join(process.cwd(), 'data', 'Productos.csv'), 'utf8'))
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.split(';'))
  .flatMap((columns) => [columns[8], columns[9]])
  .filter(Boolean)
  .map((file) => file.trim());

const uniqueFiles = [...new Set(files)];
const results = [];

for (const file of uniqueFiles) {
  const body = new FormData();
  body.append('file', new Blob([await readFile(join(imageDir, file))]), basename(file));
  body.append('upload_preset', uploadPreset);
  body.append('folder', 'due-sorelas/products');

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body,
  });
  if (!response.ok) throw new Error(`Falló ${file}: ${await response.text()}`);
  const uploaded = await response.json();
  results.push({ file, publicId: uploaded.public_id, secureUrl: uploaded.secure_url });
  console.log(`Subida: ${file}`);
}

await writeFile('data/cloudinary-image-map.json', JSON.stringify(results, null, 2));
console.log(`Completado: ${results.length} imágenes. Mapa: data/cloudinary-image-map.json`);
