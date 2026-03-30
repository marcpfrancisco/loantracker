import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyLoanCreatedPayload {
  loanId: string;
}

interface LoanRow {
  id: string;
  principal: number;
  currency: string;
  installments_total: number;
  started_at: string;
  notes: string | null;
  credit_sources: { name: string };
  borrower: { id: string; full_name: string };
  installments: { installment_no: number; amount: number; due_date: string }[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Verify JWT ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing authorization header" },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");

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

    // ── 2. Verify caller is admin ──────────────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || callerProfile?.role !== "admin") {
      return Response.json(
        { error: "Forbidden: admin access required" },
        { status: 403, headers: corsHeaders }
      );
    }

    // ── 3. Parse payload ───────────────────────────────────────────────────────
    const body = (await req.json()) as Partial<NotifyLoanCreatedPayload>;
    const { loanId } = body;

    if (!loanId) {
      return Response.json(
        { error: "Missing required field: loanId" },
        { status: 400, headers: corsHeaders }
      );
    }

    // ── 4. Fetch loan details ──────────────────────────────────────────────────
    const { data: loan, error: loanError } = await supabaseAdmin
      .from("loans")
      .select(
        `
        id,
        principal,
        currency,
        installments_total,
        started_at,
        notes,
        credit_sources!loans_source_id_fkey ( name ),
        borrower:profiles!loans_borrower_id_fkey ( id, full_name ),
        installments ( installment_no, amount, due_date )
      `
      )
      .eq("id", loanId)
      .single();

    if (loanError || !loan) {
      console.error("[notify-loan-created] Loan fetch error:", loanError?.message);
      return Response.json({ error: "Loan not found" }, { status: 404, headers: corsHeaders });
    }

    const typedLoan = loan as unknown as LoanRow;

    // ── 5. Get borrower email from auth.users ──────────────────────────────────
    const {
      data: { user: borrowerUser },
      error: borrowerError,
    } = await supabaseAdmin.auth.admin.getUserById(typedLoan.borrower.id);

    if (borrowerError || !borrowerUser?.email) {
      console.error("[notify-loan-created] Borrower email fetch error:", borrowerError?.message);
      return Response.json(
        { error: "Borrower email not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // ── 6. Send email via Brevo ────────────────────────────────────────────────
    const brevoKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoKey) {
      console.warn("[notify-loan-created] BREVO_API_KEY not set — skipping email");
      return Response.json({ ok: true, email_sent: false }, { headers: corsHeaders });
    }

    const fromEmail = Deno.env.get("BREVO_FROM_EMAIL") ?? "noreply@loantracker.app";
    const fromName = Deno.env.get("BREVO_FROM_NAME") ?? "Loan Tracker";
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://loantracker.app";

    const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevoKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: borrowerUser.email, name: typedLoan.borrower.full_name }],
        subject: `Your ${typedLoan.credit_sources.name} loan has been created`,
        htmlContent: buildLoanCreatedEmail({
          borrowerName: typedLoan.borrower.full_name,
          sourceName: typedLoan.credit_sources.name,
          loanUrl: `${siteUrl}/loans/${typedLoan.id}`,
          principal: typedLoan.principal,
          currency: typedLoan.currency,
          installmentsTotal: typedLoan.installments_total,
          installments: typedLoan.installments
            .slice()
            .sort((a, b) => a.installment_no - b.installment_no),
          notes: typedLoan.notes,
        }),
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("[notify-loan-created] Brevo error:", errText);
      return Response.json(
        { ok: true, email_sent: false, email_error: errText },
        { headers: corsHeaders }
      );
    }

    return Response.json({ ok: true, email_sent: true }, { headers: corsHeaders });
  } catch (err) {
    console.error("[notify-loan-created] Unexpected error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildLoanCreatedEmail(params: {
  borrowerName: string;
  sourceName: string;
  loanUrl: string;
  principal: number;
  currency: string;
  installmentsTotal: number;
  installments: { installment_no: number; amount: number; due_date: string }[];
  notes: string | null;
}): string {
  const {
    borrowerName,
    sourceName,
    loanUrl,
    principal,
    currency,
    installmentsTotal,
    installments,
    notes,
  } = params;

  const firstInstallment = installments[0];
  const lastInstallment = installments[installments.length - 1];

  // Show first 3 installments in the schedule preview
  const previewInstallments = installments.slice(0, 3);
  const hasMore = installmentsTotal > 3;

  const scheduleRows = previewInstallments
    .map(
      (inst) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;font-size:13px;color:#9ca3af;">
        Installment #${inst.installment_no}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;font-size:13px;color:#d1d5db;text-align:center;">
        ${formatDate(inst.due_date)}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;font-size:13px;color:#6ee7b7;font-weight:600;text-align:right;">
        ${formatCurrency(Number(inst.amount), currency)}
      </td>
    </tr>`
    )
    .join("");

  const moreRow = hasMore
    ? `<tr>
        <td colspan="3" style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:center;">
          + ${installmentsTotal - 3} more installments · last due ${formatDate(lastInstallment.due_date)}
        </td>
      </tr>`
    : "";

  const notesSection = notes
    ? `<div style="background:#1e2a1e;border:1px solid #2a4030;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Notes from your lender</p>
        <p style="margin:0;font-size:13px;color:#a7f3d0;line-height:1.6;">${notes}</p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px 16px;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:540px;margin:0 auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">

    <!-- Header -->
    <div style="background:#0a1f0e;border-bottom:1px solid #1a4030;padding:28px;">
      <p style="margin:0 0 6px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">Loan Tracker</p>
      <h1 style="margin:0;font-size:22px;color:#34d399;font-weight:700;">Your Loan Has Been Created! 🎉</h1>
    </div>

    <!-- Body -->
    <div style="padding:28px;">
      <p style="margin:0 0 20px;font-size:14px;color:#bbb;line-height:1.6;">
        Hi <strong style="color:#e5e5e5;">${borrowerName}</strong>,
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#bbb;line-height:1.6;">
        Your administrator has set up a new <strong style="color:#e5e5e5;">${sourceName}</strong> loan for you.
        Here's a summary of what to expect.
      </p>

      <!-- Summary card -->
      <div style="background:#111;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6b7280;">Principal</td>
            <td style="padding:6px 0;font-size:15px;color:#e5e5e5;font-weight:600;text-align:right;">
              ${formatCurrency(Number(principal), currency)}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6b7280;">Installments</td>
            <td style="padding:6px 0;font-size:13px;color:#d1d5db;text-align:right;">${installmentsTotal} months</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6b7280;">First payment due</td>
            <td style="padding:6px 0;font-size:13px;color:#d1d5db;text-align:right;">
              ${firstInstallment ? formatDate(firstInstallment.due_date) : "—"}
            </td>
          </tr>
        </table>
      </div>

      <!-- Payment schedule preview -->
      <p style="margin:0 0 10px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Payment Schedule</p>
      <div style="border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#111;">
              <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;">Installment</th>
              <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:center;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;">Due Date</th>
              <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:right;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${scheduleRows}
            ${moreRow}
          </tbody>
        </table>
      </div>

      ${notesSection}

      <!-- CTA -->
      <div style="text-align:center;margin:28px 0 20px;">
        <a href="${loanUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 36px;border-radius:10px;letter-spacing:0.02em;">
          View Loan Details
        </a>
      </div>

      <p style="margin:0;font-size:12px;color:#666;line-height:1.6;text-align:center;">
        You can upload your payment proofs directly through the app when you're ready to pay.
      </p>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #2a2a2a;padding:16px 28px;">
      <p style="margin:0;font-size:12px;color:#555;">
        This is an automated message from Loan Tracker. Do not reply to this email.
      </p>
    </div>

  </div>
</body>
</html>`;
}
