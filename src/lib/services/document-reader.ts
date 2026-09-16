/** Browser-only document reading. Documents are data, never executable instructions. */
export async function readDocumentText(file: File): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error('Invoice exceeds the 20 MB limit.');
  const { createWorker } = await import('tesseract.js');
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  const recognize = async (image: File | HTMLCanvasElement) => {
    worker ??= await createWorker('eng+ara', 1, { workerPath: '/ocr/worker.min.js', corePath: '/ocr/core', langPath: '/ocr/lang' });
    const result = await worker.recognize(image);
    return result.data.text;
  };
  try {
    if (!file.name.toLowerCase().endsWith('.pdf')) return await recognize(file);
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const document = await loadingTask.promise;
    try {
      if (document.numPages > 30) throw new Error('Please split invoices longer than 30 pages.');
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const rows = new Map<number, { x: number; text: string }[]>();
        for (const item of content.items) {
          if (!('str' in item)) continue;
          const y = Math.round(item.transform[5] / 3) * 3;
          const row = rows.get(y) ?? [];
          row.push({ x: item.transform[4], text: item.str });
          rows.set(y, row);
        }
        const text = [...rows.entries()].sort((a, b) => b[0] - a[0])
          .map(([, row]) => row.sort((a, b) => a.x - b.x).map(item => item.text).join(' ')).join('\n');
        if (text.replace(/\s/g, '').length >= 40) pages.push(text);
        else {
          const viewport = page.getViewport({ scale: 2 });
          if (viewport.width * viewport.height > 20_000_000) throw new Error('PDF page is too large to read safely.');
          const canvas = window.document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          await page.render({ canvas, viewport }).promise;
          pages.push(await recognize(canvas));
          canvas.width = 0; canvas.height = 0;
        }
      }
      return pages.join('\n\n');
    } finally { await loadingTask.destroy(); }
  } finally { await worker?.terminate(); }
}
