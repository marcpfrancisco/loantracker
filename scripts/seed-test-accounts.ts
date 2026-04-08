/**
 * seed-test-accounts.ts
 * ─────────────────────
 * Creates two predictable test accounts for local / staging development:
 *
 *   Lender  test.lender@loantracker.dev   / TestLender123!
 *   Borrower test.borrower@loantracker.dev / TestBorrower123!
 *
 * The lender is fully set up (org + admin role + credit sources).
 * The borrower is invited into the lender's org (borrower role).
 *
 * Safe to re-run — existing accounts are skipped, not duplicated.
 *
 * Usage:
 *   npm run seed:test
 *
 * Requirements:
 *   VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env
 */

import { createClient } from "@supabase/supabase-js";
import { CREDIT_SOURCE_CONFIGS } from "../src/types/schema";

// ── Env vars (loaded via --env-file=.env by the npm script) ──────────────────

const SUPABASE_URL = process.env["VITE_SUPABASE_URL"];
const SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌  Missing env vars.\n" +
    "    VITE_SUPABASE_URL     → from your Supabase project settings\n" +
    "    SUPABASE_SERVICE_ROLE_KEY → Settings → API → service_role key\n" +
    "    Add both to your .env file and retry."
  );
  process.exit(1);
}

// ── Supabase admin client ─────────────────────────────────────────────────────

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Test account definitions ──────────────────────────────────────────────────

const LENDER = {
  email: "test.lender@loantracker.dev",
  password: "TestLender123!",
  full_name: "Test Lender",
  region: "PH",
};

const BORROWER = {
  email: "test.borrower@loantracker.dev",
  password: "TestBorrower123!",
  full_name: "Test Borrower",
  region: "PH",
};

// ── Build credit source rows from schema.ts ───────────────────────────────────
// Derives the seed rows from CREDIT_SOURCE_CONFIGS — the single source of truth
// for credit sources, loan types, and their default configurations.
// Only the lender's own region is seeded; additional regions are added by the
// lender via the Credit Sources drawer if needed.

function buildCreditSourceSeeds(region: string, orgId: string) {
  return CREDIT_SOURCE_CONFIGS.filter((c) => c.region === region).map((c) => {
    // Use the first loan type config as the source of default values.
    // interest_rate in schema is stored as a percentage (e.g. 2.95);
    // the DB column default_interest_rate stores it as a decimal (0.0295).
    const primary = c.loan_types[0];
    return {
      org_id: orgId,
      name: c.name,
      type: c.type,
      region: c.region,
      default_interest_rate:
        primary?.interest_rate != null ? primary.interest_rate / 100 : null,
      default_installments: primary?.installments_total ?? null,
      default_due_day: primary?.due_day_of_month ?? null,
    };
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base}-test`;
}

async function findExistingUser(email: string): Promise<string | null> {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = data?.users?.find((u) => u.email === email);
  return found?.id ?? null;
}

// ── Step 1: Create the lender ─────────────────────────────────────────────────

async function seedLender(): Promise<string> {
  console.log("\n── Lender ───────────────────────────────────────────");

  // Check if already exists
  const existingId = await findExistingUser(LENDER.email);
  if (existingId) {
    console.log(`  ⏭  User already exists (${existingId}) — checking org…`);

    const { data: member } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", existingId)
      .eq("role", "admin")
      .maybeSingle();

    if (member?.org_id) {
      console.log(`  ⏭  Org already exists (${member.org_id}) — skipping lender setup.`);
      return member.org_id as string;
    }
  }

  // 1a. Create org
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: LENDER.full_name, slug: toSlug(LENDER.full_name), region: LENDER.region, plan: "free" })
    .select("id")
    .single();

  if (orgErr || !org) {
    console.error("  ❌  Failed to create organization:", orgErr?.message);
    process.exit(1);
  }
  const orgId = org.id as string;
  console.log(`  ✓  Organization created  (${orgId})`);

  // 1b. Create auth user (trigger auto-creates profile row)
  const userId = existingId ?? await (async () => {
    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email: LENDER.email,
      password: LENDER.password,
      email_confirm: true,
      user_metadata: {
        full_name: LENDER.full_name,
        region: LENDER.region,
        role: "admin",
      },
    });
    if (userErr || !userData.user) {
      // Roll back org
      await admin.from("organizations").delete().eq("id", orgId);
      console.error("  ❌  Failed to create auth user:", userErr?.message);
      process.exit(1);
    }
    console.log(`  ✓  Auth user created     (${userData.user.id})`);
    return userData.user.id;
  })();

  // 1c. org_members
  const { error: memberErr } = await admin
    .from("org_members")
    .insert({ org_id: orgId, user_id: userId, role: "admin" });
  if (memberErr) console.warn("  ⚠  org_members:", memberErr.message);
  else console.log("  ✓  org_members row created");

  // 1d. user_org_context
  const { error: ctxErr } = await admin
    .from("user_org_context")
    .insert({ user_id: userId, org_id: orgId });
  if (ctxErr) console.warn("  ⚠  user_org_context:", ctxErr.message);
  else console.log("  ✓  user_org_context row created");

  // 1e. Seed credit sources — derived from schema.ts, lender's region only
  const regionSeeds = buildCreditSourceSeeds(LENDER.region, orgId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: seedErr } = await admin.from("credit_sources").insert(regionSeeds as any);
  if (seedErr) console.warn("  ⚠  credit_sources seed:", seedErr.message);
  else console.log(`  ✓  ${regionSeeds.length} credit sources seeded from schema.ts (${LENDER.region} only)`);

  return orgId;
}

// ── Step 2: Create the borrower ───────────────────────────────────────────────

async function seedBorrower(lenderOrgId: string): Promise<void> {
  console.log("\n── Borrower ─────────────────────────────────────────");

  const existingId = await findExistingUser(BORROWER.email);
  if (existingId) {
    console.log(`  ⏭  User already exists (${existingId})`);

    const { data: member } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", existingId)
      .eq("org_id", lenderOrgId)
      .maybeSingle();

    if (member) {
      console.log("  ⏭  Already a member of the lender's org — skipping borrower setup.");
      return;
    }
  }

  // 2a. Create auth user (trigger auto-creates profile row)
  const userId = existingId ?? await (async () => {
    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email: BORROWER.email,
      password: BORROWER.password,
      email_confirm: true,
      user_metadata: {
        full_name: BORROWER.full_name,
        region: BORROWER.region,
        role: "borrower",
      },
    });
    if (userErr || !userData.user) {
      console.error("  ❌  Failed to create auth user:", userErr?.message);
      process.exit(1);
    }
    console.log(`  ✓  Auth user created     (${userData.user.id})`);
    return userData.user.id;
  })();

  // 2b. org_members — borrow role under lender's org
  const { error: memberErr } = await admin
    .from("org_members")
    .insert({ org_id: lenderOrgId, user_id: userId, role: "borrower" });
  if (memberErr) console.warn("  ⚠  org_members:", memberErr.message);
  else console.log("  ✓  org_members row created (borrower role)");

  // 2c. user_org_context — point to lender's org
  const { error: ctxErr } = await admin
    .from("user_org_context")
    .upsert({ user_id: userId, org_id: lenderOrgId });
  if (ctxErr) console.warn("  ⚠  user_org_context:", ctxErr.message);
  else console.log("  ✓  user_org_context row created");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding test accounts…");
  console.log(`    Supabase URL: ${SUPABASE_URL}`);

  const lenderOrgId = await seedLender();
  await seedBorrower(lenderOrgId);

  console.log("\n✅  Done!\n");
  console.log("  Test credentials");
  console.log("  ─────────────────────────────────────────────────");
  console.log(`  Lender   ${LENDER.email}`);
  console.log(`           ${LENDER.password}   (role: admin)`);
  console.log("");
  console.log(`  Borrower ${BORROWER.email}`);
  console.log(`           ${BORROWER.password}   (role: borrower)`);
  console.log("  ─────────────────────────────────────────────────");
  console.log("  Log in as the Lender to invite / manage the Borrower.\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
