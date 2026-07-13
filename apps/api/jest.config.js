/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coveragePathIgnorePatterns: [
    "main.ts$",
    "\\.module\\.ts$",
    "jwt.strategy.ts$",
    "jwt-auth.guard.ts$",
  ],
  coverageThreshold: {
    global: {
      lines: 88,
      statements: 88,
      functions: 88,
      branches: 88,
    },
  },
  coverageDirectory: "../coverage",
  testEnvironment: "node",
};
