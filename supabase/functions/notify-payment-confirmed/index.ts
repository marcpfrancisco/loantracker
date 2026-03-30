import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyPaymentPayload {
  installmentIds: string[];
}

interface InstallmentRow {
  id: string;
  installment_no: number;
  amount: number;
  due_date: string;
  paid_at: string | null;
  loans: {
    id: string;
    currency: string;
    credit_sources: { name: string };
    borrower: { id: string; full_name: string };
  };
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
    const body = (await req.json()) as Partial<NotifyPaymentPayload>;
    const { installmentIds } = body;

    if (!installmentIds?.length) {
      return Response.json(
        { error: "Missing required field: installmentIds" },
        { status: 400, headers: corsHeaders }
      );
    }

    // ── 4. Fetch installment details ───────────────────────────────────────────
    const { data: installments, error: instError } = await supabaseAdmin
      .from("installments")
      .select(
        `
        id,
        installment_no,
        amount,
        due_date,
        paid_at,
        loans!installments_loan_id_fkey (
          id,
          currency,
          credit_sources!loans_source_id_fkey ( name ),
          borrower:profiles!loans_borrower_id_fkey ( id, full_name )
        )
      `
      )
      .in("id", installmentIds)
      .order("installment_no", { ascending: true });

    if (instError || !installments?.length) {
      console.error("[notify-payment-confirmed] Installment fetch error:", instError?.message);
      return Response.json({ error: "Installments not found" }, { status: 404, headers: corsHeaders });
    }

    // ── 5. Group by borrower (all should be same loan in practice) ─────────────
    const byBorrower = new Map<
      string,
      { borrowerId: string; borrowerName: string; sourceName: string; loanId: string; currency: string; rows: InstallmentRow[] }
    >();

    for (const inst of installments as InstallmentRow[]) {
      const { id: borrowerId, full_name: borrowerName } = inst.loans.borrower;
      if (!byBorrower.has(borrowerId)) {
        byBorrower.set(borrowerId, {
          borrowerId,
          borrowerName,
          sourceName: inst.loans.credit_sources.name,
          loanId: inst.loans.id,
          currency: inst.loans.currency,
          rows: [],
        });
      }
      byBorrower.get(borrowerId)!.rows.push(inst);
    }

    // ── 6. Send one email per borrower ─────────────────────────────────────────
    const brevoKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoKey) {
      console.warn("[notify-payment-confirmed] BREVO_API_KEY not set — skipping email");
      return Response.json({ ok: true, emails_sent: 0 }, { headers: corsHeaders });
    }

    const fromEmail = Deno.env.get("BREVO_FROM_EMAIL") ?? "noreply@loantracker.app";
    const fromName = Deno.env.get("BREVO_FROM_NAME") ?? "Loan Tracker";
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://loantracker.app";

    let emailsSent = 0;

    for (const group of byBorrower.values()) {
      const {
        data: { user: borrowerUser },
        error: borrowerError,
      } = await supabaseAdmin.auth.admin.getUserById(group.borrowerId);

      if (borrowerError || !borrowerUser?.email) {
        console.error(
          "[notify-payment-confirmed] Borrower email fetch error:",
          borrowerError?.message
        );
        continue;
      }

      const count = group.rows.length;
      const subject =
        count === 1
          ? `Payment confirmed — ${group.sourceName} Installment #${group.rows[0].installment_no}`
          : `${count} payments confirmed — ${group.sourceName}`;

      const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevoKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: borrowerUser.email, name: group.borrowerName }],
          subject,
          htmlContent: buildConfirmationEmail({
            borrowerName: group.borrowerName,
            sourceName: group.sourceName,
            loanUrl: `${siteUrl}/loans/${group.loanId}`,
            currency: group.currency,
            installments: group.rows,
          }),
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("[notify-payment-confirmed] Brevo error:", errText);
      } else {
        emailsSent++;
      }
    }

    return Response.json({ ok: true, emails_sent: emailsSent }, { headers: corsHeaders });
  } catch (err) {
    console.error("[notify-payment-confirmed] Unexpected error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
});

// ── Email builder ──────────────────────────────────────────────────────────────

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

function buildConfirmationEmail(params: {
  borrowerName: string;
  sourceName: string;
  loanUrl: string;
  currency: string;
  installments: InstallmentRow[];
}): string {
  const { borrowerName, sourceName, loanUrl, currency, installments } = params;

  const installmentRows = installments
    .map(
      (inst) => `
    <div style="background:#0d1f17;border:1px solid #1a4030;border-radius:10px;padding:16px 20px;margin-bottom:12px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:0;">
            <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">
              Installment #${inst.installment_no}
            </p>
            <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">
              Due: ${formatDate(inst.due_date)}${inst.paid_at ? ` &nbsp;·&nbsp; Paid: ${formatDate(inst.paid_at.split("T")[0])}` : ""}
            </p>
          </td>
          <td style="padding:0;text-align:right;vertical-align:top;">
            <p style="margin:0;font-size:15px;color:#6ee7b7;font-weight:600;">
              ${formatCurrency(Number(inst.amount), currency)}
            </p>
          </td>
        </tr>
      </table>
    </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px 16px;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">

    <!-- Header -->
    <div style="background:#0f1a14;border-bottom:1px solid #1a4030;padding:24px 28px;">
      <p style="margin:0 0 6px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">Loan Tracker</p>
      <h1 style="margin:0;font-size:20px;color:#34d399;font-weight:600;">Payment Confirmed ✓</h1>
    </div>

    <!-- Body -->
    <div style="padding:28px;">
      <p style="margin:0 0 16px;font-size:14px;color:#bbb;line-height:1.6;">
        Hi <strong style="color:#e5e5e5;">${borrowerName}</strong>,
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#bbb;line-height:1.6;">
        Your administrator has confirmed the following payment${installments.length > 1 ? "s" : ""} for your
        <strong style="color:#e5e5e5;">${sourceName}</strong> loan.
      </p>

      ${installmentRows}

      <!-- CTA -->
      <div style="text-align:center;margin:28px 0 20px;">
        <a href="${loanUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;letter-spacing:0.02em;">
          View Loan
        </a>
      </div>

      <p style="margin:0;font-size:12px;color:#666;line-height:1.6;">
        Your outstanding balance has been updated. Log in to the app to view your full installment history.
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
