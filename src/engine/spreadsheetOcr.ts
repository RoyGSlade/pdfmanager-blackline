import { createWorker, OEM, PSM } from 'tesseract.js';
// @ts-expect-error Vite emits these worker assets as same-origin files.
import workerPath from 'tesseract.js/dist/worker.min.js?url';
// @ts-expect-error This core includes its WASM and works on browsers without SIMD.
import corePath from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url';
// @ts-expect-error Vite emits the English language model as a static asset.
import modelPath from '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz?url';
import type { TableToken } from './spreadsheetLayout';

export async function createScanner(
  signal: AbortSignal,
  progress: (stage: string, value: number) => void,
) {
  signal.throwIfAborted();

  let rejectWorker: (error: unknown) => void = () => {};
  const failure = new Promise<never>((_, reject) => { rejectWorker = reject; });
  const cancel = () => rejectWorker(signal.reason);
  signal.addEventListener('abort', cancel, { once: true });
  const initializing = createWorker('eng', OEM.LSTM_ONLY, {
    workerPath,
    corePath,
    langPath: new URL('.', new URL(modelPath, window.location.href)).href,
    cacheMethod: 'none',
    workerBlobURL: false,
    logger: ({ status, progress: value }) => progress(
      status === 'recognizing text' ? 'Reading scan' : 'Loading scan reader', value,
    ),
    errorHandler: rejectWorker,
  }, { load_system_dawg: '0', load_freq_dawg: '0' });
  const timeout = window.setTimeout(() => rejectWorker(new Error('The scan reader took too long to start.')), 45_000);
  let worker: Awaited<typeof initializing>;
  try {
    worker = await Promise.race([initializing, failure]);
    await Promise.race([
      failure,
      worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, user_defined_dpi: '300' }),
    ]);
  } catch (error) {
    signal.removeEventListener('abort', cancel);
    void initializing.then(instance => instance.terminate(), () => {});
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  return {
    async read(canvas: HTMLCanvasElement): Promise<TableToken[]> {
      signal.throwIfAborted();
      const { data } = await Promise.race([
        failure,
        worker.recognize(canvas, {}, { blocks: true, text: false }),
      ]);
      return (data.blocks ?? []).flatMap(block => block.paragraphs)
        .flatMap(paragraph => paragraph.lines)
        .flatMap(line => line.words)
        .filter(word => word.text.trim())
        .map(word => ({
          text: word.text.trim(),
          left: word.bbox.x0 / canvas.width,
          right: word.bbox.x1 / canvas.width,
          top: word.bbox.y0 / canvas.height,
          bottom: word.bbox.y1 / canvas.height,
          confidence: word.confidence,
        }));
    },
    async close() {
      signal.removeEventListener('abort', cancel);
      await worker.terminate();
    },
  };
}
