// JSDOM polyfills and test conveniences
// Ensure HTMLMediaElement.load exists and is a no-op to avoid "Not implemented" warnings
if (typeof HTMLMediaElement !== 'undefined') {
  if (!HTMLMediaElement.prototype.load) {
    // @ts-ignore
    HTMLMediaElement.prototype.load = function () { /* no-op for tests */ };
  }
}

// Guard: ensure navigator.clipboard exists with readText/writeText no-ops when missing
if (typeof navigator !== 'undefined' && !('clipboard' in navigator)) {
  // @ts-ignore
  navigator.clipboard = {
    writeText: async (text: string) => Promise.resolve(text),
    readText: async () => Promise.resolve(''),
  };
}
