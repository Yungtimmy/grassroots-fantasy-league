delete process.env.DATABASE_URL;
delete process.env.DIRECT_URL;

process.env.PAYMENT_PROVIDER = "mock";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.ADMIN_SESSION_SECRET = "test-admin-secret";

if (process.env.DATABASE_URL || process.env.DIRECT_URL) {
  throw new Error("Refusing to run tests while a database URL is set");
}
