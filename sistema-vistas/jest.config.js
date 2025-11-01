/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  verbose: true,
  clearMocks: true,
  coverageDirectory: "coverage",
  testTimeout: 30000,
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)'
  ],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/tests/__mocks__/uuid.js'
  },
  testPathIgnorePatterns: [
    '<rootDir>/tests/e2e/'
  ]
};

module.exports = config;
