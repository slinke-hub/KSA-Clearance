import { mkdir, copyFile, readdir, writeFile } from 'node:fs/promises';
await mkdir('public/ocr/core', { recursive: true });
await mkdir('public/ocr/lang', { recursive: true });
await copyFile('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'public/pdf.worker.min.mjs');
await copyFile('node_modules/tesseract.js/dist/worker.min.js', 'public/ocr/worker.min.js');
for (const name of await readdir('node_modules/tesseract.js-core')) {
  if (/\.wasm(?:\.js)?$/.test(name)) await copyFile(`node_modules/tesseract.js-core/${name}`, `public/ocr/core/${name}`);
}
for (const language of ['eng', 'ara']) {
  const response = await fetch(`https://tessdata.projectnaptha.com/4.0.0/${language}.traineddata.gz`, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Cannot download OCR language ${language}`);
  await writeFile(`public/ocr/lang/${language}.traineddata.gz`, new Uint8Array(await response.arrayBuffer()));
}
console.log('Local PDF and English/Arabic OCR assets ready.');
