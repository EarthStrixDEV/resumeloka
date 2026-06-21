// Serializes OCR calls with a minimum spacing to stay under Typhoon's 2 RPS OCR
// limit (spec §8). Single-instance, in-memory — good enough for one server process.

const MIN_SPACING_MS = 600; // ~1.6 RPS, comfortably under the 2 RPS cap

let queue: Promise<unknown> = Promise.resolve();

/** Runs `fn` after the previous OCR call, spaced by MIN_SPACING_MS. */
export function throttleOcr<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    await new Promise((resolve) => setTimeout(resolve, MIN_SPACING_MS));
    return fn();
  });
  // Keep the chain alive even if a call rejects.
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
