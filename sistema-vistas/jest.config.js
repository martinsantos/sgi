/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  verbose: true,
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",
};

module.exports = config;
