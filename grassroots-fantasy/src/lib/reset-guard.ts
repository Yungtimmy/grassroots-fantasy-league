/**
 * Test-data reset is available in local/test runs.
 * In production it stays disabled unless ALLOW_TEST_DATA_RESET=true.
 */
export function isTestDataResetEnabled(env: {
  NODE_ENV?: string;
  ALLOW_TEST_DATA_RESET?: string;
} = process.env): boolean {
  if (env.NODE_ENV !== "production") return true;
  return env.ALLOW_TEST_DATA_RESET === "true";
}
