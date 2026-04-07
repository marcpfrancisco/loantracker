import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  region: "PH" | "UAE";
}

// Seeded for every new org so lenders have sources ready on day one.
// Both regions are included regardless of the org's primary region —
// a lender may have borrowers in both PH and UAE.
const CREDIT_SOURCE_SEEDS = [
  // Philippines
  { name: "Seabank",    type: "e_wallet",    region: "PH" },
  { name: "GCash",      type: "e_wallet",    region: "PH" },
  { name: "SPayLater",  type: "bnpl",        region: "PH" },
  { name: "Lazada",     type: "bnpl",        region: "PH" },
  { name: "BPI",        type: "credit_card", region: "PH" },
  { name: "Metrobank",  type: "credit_card", region: "PH" },
  // UAE
  { name: "Tabby",        type: "bnpl",        region: "UAE" },
  { name: "Emirates NBD", type: "credit_card", region: "UAE" },
  { name: "Mashreq",      type: "credit_card", region: "UAE" },
  { name: "ADCB",         type: "credit_card", region: "UAE" },
];

function toSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  // Append random suffix so slugs are always unique without a DB lookup
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Track org_id for rollback if user creation fails mid-flight
  let orgId: string | null = null;

  try {
    // ── 1. Parse and validate payload ─────────────────────────────────────────
    const body = (await req.json()) as Partial<RegisterPayload>;
    const { full_name, email, password, region } = body;

    if (!full_name?.trim() || !email?.trim() || !password || !region) {
      return Response.json(
        { error: "Missing required fields: full_name, email, password, region" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!["PH", "UAE"].includes(region)) {
      return Response.json(
        { error: "Invalid region. Must be PH or UAE." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters." },
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

    // ── 2. Build service-role client (bypasses RLS) ───────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── 3. Create the organization row first ──────────────────────────────────
    // Org name defaults to the lender's full name (P2P: person-to-person lending).
    // Lenders can rename it later from the Org Settings page.
    const orgName = full_name.trim();

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({ name: orgName, slug: toSlug(orgName), region })
      .select("id")
      .single();

    if (orgError || !org) {
      console.error("[register-lender] org creation error:", orgError);
      return Response.json(
        { error: "Failed to create organization. Please try again." },
        { status: 500, headers: corsHeaders }
      );
    }

    orgId = org.id as string;

    // ── 4. Create auth user ───────────────────────────────────────────────────
    // email_confirm: true → account is immediately active, no email verification step.
    // Note: org_id is NOT passed in metadata — handle_new_user() no longer stamps it
    // on profiles (migration 007). org membership is managed via org_members +
    // user_org_context below.
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        region,
        role: "admin",
      },
    });

    if (userError || !userData.user) {
      // Roll back: delete the org we created to avoid orphaned rows
      await supabaseAdmin.from("organizations").delete().eq("id", orgId);
      orgId = null;

      const message = userError?.message?.toLowerCase().includes("already registered")
        ? "An account with this email already exists."
        : (userError?.message ?? "Failed to create account. Please try again.");

      return Response.json({ error: message }, { status: 400, headers: corsHeaders });
    }

    const userId = userData.user.id;

    // ── 5. Create org_members row ─────────────────────────────────────────────
    // Links the new user as the admin/owner of their organization.
    const { error: memberError } = await supabaseAdmin
      .from("org_members")
      .insert({ org_id: orgId, user_id: userId, role: "admin" });

    if (memberError) {
      console.error("[register-lender] org_members insert failed:", memberError.message);
    }

    // ── 6. Seed user_org_context ──────────────────────────────────────────────
    // Sets the user's active org so my_org_id() works immediately on first login.
    // Without this row the user would see no data (all RLS policies call my_org_id()).
    const { error: contextError } = await supabaseAdmin
      .from("user_org_context")
      .insert({ user_id: userId, org_id: orgId });

    if (contextError) {
      console.error("[register-lender] user_org_context insert failed:", contextError.message);
    }

    // ── 7. Seed default credit sources ────────────────────────────────────────
    const { error: seedError } = await supabaseAdmin
      .from("credit_sources")
      .insert(CREDIT_SOURCE_SEEDS.map((s) => ({ ...s, org_id: orgId })));

    if (seedError) {
      // Non-fatal — lender can add sources via the Credit Sources UI.
      console.error("[register-lender] credit_sources seed failed:", seedError.message);
    }

    console.log(
      `[register-lender] ✓ org="${orgName}" org_id=${orgId} user_id=${userId}`
    );

    return Response.json({ success: true }, { headers: corsHeaders });

  } catch (err) {
    console.error("[register-lender] unexpected error:", err);

    // Best-effort rollback: if org was created but an exception occurred before
    // user creation completed, delete the orphaned org row.
    if (orgId) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        await supabaseAdmin.from("organizations").delete().eq("id", orgId);
        console.log("[register-lender] rolled back org", orgId);
      } catch (rollbackErr) {
        console.error("[register-lender] rollback failed:", rollbackErr);
      }
    }

    return Response.json(
      { error: "Internal server error. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
});
