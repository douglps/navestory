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
    "supabase-auth.guard.ts$",
    "\\.dto\\.ts$",
    "supabase.constants.ts$",
    "supabase.module.ts$",
    "supabase-admin.module.ts$",
    "create-user-scoped-client.ts$",
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
