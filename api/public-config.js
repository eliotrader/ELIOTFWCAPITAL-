export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      ok: false,
      error: 'Supabase public configuration is missing'
    });
  }

  return res.status(200).json({
    ok: true,
    supabaseUrl,
    supabaseAnonKey
  });
}
