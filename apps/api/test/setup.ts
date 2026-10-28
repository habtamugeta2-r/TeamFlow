import "dotenv/config";

// Health endpoint unit tests should not require a real database.
// Use a fallback URL only when DATABASE_URL is not already configured.
process.env.DATABASE_URL ??=
  "postgresql://teamflow_test:teamflow_test@127.0.0.1:5432/teamflow_test";
