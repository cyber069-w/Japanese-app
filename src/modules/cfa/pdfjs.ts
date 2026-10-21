/** Loads pdf.js on demand (it is big, so it only comes when a PDF is opened) and opens a PDF from a Blob. */
export async function openPdf(blob: Blob) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
  return { pdfjs, task, doc: await task.promise };
}
