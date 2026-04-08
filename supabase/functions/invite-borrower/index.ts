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
      return Response.json(
        { error: "Missing authorization header" },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // ── 2. Verify caller is a real authenticated user ──────────────────────────
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser(token);

    if (userError || !user) {
      return Response.json(
        { error: `Unauthorized: ${userError?.message ?? "no user"}` },
        { status: 401, headers: corsHeaders }
      );
    }

    // ── 3. Verify caller is an admin and fetch their active org ───────────────
    // After migration 007: profiles no longer has org_id. The active org is in
    // user_org_context. We also verify the caller is actually admin in that org.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: context, error: contextError } = await supabaseAdmin
      .from("user_org_context")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (contextError || !context?.org_id) {
      return Response.json(
        { error: "Forbidden: no active organization found" },
        { status: 403, headers: corsHeaders }
      );
    }

    const orgId = context.org_id as string;

    // Confirm the caller is an admin in their active org
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("org_id", orgId)
      .single();

    if (membershipError || membership?.role !== "admin") {
      return Response.json(
        { error: "Forbidden: admin access required" },
        { status: 403, headers: corsHeaders }
      );
    }

    // ── 4. Parse and validate payload ─────────────────────────────────────────
    const body = (await req.json()) as Partial<InvitePayload>;
    const { email, full_name, region } = body;

    if (!email || !full_name || !region) {
      return Response.json(
        { error: "Missing required fields: email, full_name, region" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!["PH", "UAE"].includes(region)) {
      return Response.json(
        { error: "Invalid region. Must be PH or UAE." },
        { status: 400, headers: corsHeaders }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json(
        { error: "Invalid email address." },
        { status: 400, headers: corsHeaders }
      );
    }

    // ── 5. Send invite ────────────────────────────────────────────────────────
    // Note: org_id is NOT passed in metadata — handle_new_user() no longer stamps
    // it on profiles (migration 007). org membership is created explicitly below.
    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name, region, role: "borrower" },
        options: { redirectTo: `${siteUrl}/reset-password` },
      }
    );

    if (inviteError) {
      const message = inviteError.message.includes("already been registered")
        ? "A user with this email already exists."
        : inviteError.message;
      return Response.json({ error: message }, { status: 400, headers: corsHeaders });
    }

    // ── 6. Create org_members row for the new borrower ────────────────────────
    // inviteUserByEmail creates the auth user immediately and returns their id.
    // We create org_members here so RLS policies work as soon as they accept.
    const borrowerUserId = inviteData.user?.id;

    if (borrowerUserId) {
      const { error: memberError } = await supabaseAdmin
        .from("org_members")
        .insert({ org_id: orgId, user_id: borrowerUserId, role: "borrower" });

      if (memberError) {
        console.error("[invite-borrower] org_members insert failed:", memberError.message);
      }

      // ── 7. Seed user_org_context for the borrower ──────────────────────────
      // Sets their active org so my_org_id() resolves correctly when they first
      // log in. Without this, all RLS policies would return no data.
      const { error: contextInsertError } = await supabaseAdmin
        .from("user_org_context")
        .insert({ user_id: borrowerUserId, org_id: orgId });

      if (contextInsertError) {
        console.error("[invite-borrower] user_org_context insert failed:", contextInsertError.message);
      }
    } else {
      console.warn("[invite-borrower] no user id returned from invite — org_members/context not created");
    }

    return Response.json({ success: true }, { headers: corsHeaders });

  } catch (err) {
    console.error("[invite-borrower] unexpected error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
});
