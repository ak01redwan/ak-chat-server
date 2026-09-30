module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // Plain CommonJS, so no Babel transform is required.
  transform: {},
  testTimeout: 30000,
  verbose: true,
};
