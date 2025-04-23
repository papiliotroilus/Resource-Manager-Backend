/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
  collectCoverage: true,
  coverageDirectory: './coverage/',
  verbose: true,
  testPathIgnorePatterns: [
      "/node_modules/"
  ],
};