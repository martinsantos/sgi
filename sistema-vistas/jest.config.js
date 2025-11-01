/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  verbose: true,
  clearMocks: true,
  coverageDirectory: "coverage",
  testTimeout: 30000,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/app.js',
    '!src/index.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
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
