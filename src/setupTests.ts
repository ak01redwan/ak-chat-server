import '@testing-library/jest-dom';

// Provide a valid-but-fake Firebase web config so components can initialize the
// Firebase SDK in tests. Real network calls are never made: every Firebase module
// or hook that touches the network is mocked at the module level in each test file.
process.env.REACT_APP_FIREBASE_API_KEY = 'test-api-key';
process.env.REACT_APP_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.REACT_APP_FIREBASE_PROJECT_ID = 'test-project';
process.env.REACT_APP_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.REACT_APP_FIREBASE_APP_ID = '1:123456789:web:test';
process.env.REACT_APP_FIREBASE_MEASUREMENT_ID = 'G-TEST';

// ---- jsdom polyfills -----------------------------------------------------
// Some Node versions do not expose the WHATWG text-codec globals in the Jest
// (jsdom) environment. Several dependencies (notably firebase) require them.
if (typeof globalThis.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('util');
  Object.assign(globalThis, { TextEncoder, TextDecoder });
}

// jsdom does not implement Element.scrollIntoView; stub it so the chat's
// auto-scroll effect does not throw during tests.
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = jest.fn();
}

// jsdom does not implement window.matchMedia, which the theme provider uses to
// follow the OS color-scheme preference. Provide an inert implementation that
// reports "no match" (i.e. dark theme) unless a test overrides it.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom does not implement the async clipboard API used by "copy message".
// `configurable` is required because @testing-library/user-event installs its
// own clipboard stub on userEvent.setup().
if (typeof navigator !== 'undefined' && !navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    writable: true,
    configurable: true,
    value: { writeText: () => Promise.resolve() },
  });
}
