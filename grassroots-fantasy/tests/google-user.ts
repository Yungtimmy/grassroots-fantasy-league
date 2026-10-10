export function supabaseUser(
  email: string,
  options?: { confirmed?: boolean; provider?: string }
) {
  const provider = options?.provider ?? "google";
  const confirmed = options?.confirmed !== false;
  return {
    data: {
      user: {
        id: "sb-user-1",
        email,
        email_confirmed_at: confirmed ? "2024-01-01T00:00:00.000Z" : null,
        app_metadata: { provider, providers: [provider] },
        identities: [{ provider }],
      },
    },
    error: null,
  };
}

export function invalidSupabaseUser() {
  return { data: { user: null }, error: { message: "invalid jwt" } };
}
