// Ensure auth tests can sign JWTs when .env has Supabase but no JWT_SECRET (e.g. CI)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production';
}
