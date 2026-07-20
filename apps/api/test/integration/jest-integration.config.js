/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "../..",
  testRegex: ".*\\.int-spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  setupFiles: ["<rootDir>/test/integration/jest-integration.setup.ts"],
  testEnvironment: "node",
  testTimeout: 30_000,
  // Suítes de integração batem no mesmo Supabase local real (não mockado). Rodar em paralelo
  // (default do Jest) dispara signUps concorrentes de suítes distintas contra o GoTrue logo após
  // `supabase start`, arriscando erro por contenção/rate-limit nesse período de warm-up.
  maxWorkers: 1,
};
