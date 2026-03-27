import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitePayload {
  email: string;
  full_name: string;
  region: "PH" | "UAE";
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Extract JWT from Authorization header ───────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Missing authorization header" }, { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("[invite-borrower] token prefix:", token.slice(0, 20));

    // ── 2. Verify caller via anon client + explicit token ──────────────────────
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    console.log("[invite-borrower] getUser error:", userError?.message ?? "none", "user:", user?.id ?? "null");
    if (userError || !user) {
      return Response.json({ error: `Unauthorized: ${userError?.message ?? "no user"}` }, { status: 401, headers: corsHeaders });
    }

    // ── 3. Verify caller is an admin (service role bypasses RLS) ──────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return Response.json({ error: "Forbidden: admin access required" }, { status: 403, headers: corsHeaders });
    }

    // ── 4. Parse and validate payload ─────────────────────────────────────────
    const body = await req.json() as Partial<InvitePayload>;
    const { email, full_name, region } = body;

    if (!email || !full_name || !region) {
      return Response.json({ error: "Missing required fields: email, full_name, region" }, { status: 400, headers: corsHeaders });
    }

    if (!["PH", "UAE"].includes(region)) {
      return Response.json({ error: "Invalid region. Must be PH or UAE." }, { status: 400, headers: corsHeaders });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: "Invalid email address." }, { status: 400, headers: corsHeaders });
    }

    // ── 5. Send invite using the already-created admin client ─────────────────
    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name, region },
      options: { redirectTo: `${siteUrl}/reset-password` },
    });

    if (inviteError) {
      // Surface friendly messages for common cases
      const message = inviteError.message.includes("already been registered")
        ? "A user with this email already exists."
        : inviteError.message;
      return Response.json({ error: message }, { status: 400, headers: corsHeaders });
    }

    return Response.json({ success: true }, { headers: corsHeaders });

  } catch (err) {
    console.error("invite-borrower error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
});
