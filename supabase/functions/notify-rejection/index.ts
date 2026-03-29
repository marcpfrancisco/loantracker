import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyPayload {
  installmentId: string;
  adminNote: string;
  fileUrl: string | null;
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
    const body = (await req.json()) as Partial<NotifyPayload>;
    const { installmentId, adminNote, fileUrl } = body;

    if (!installmentId || !adminNote) {
      return Response.json(
        { error: "Missing required fields: installmentId, adminNote" },
        { status: 400, headers: corsHeaders }
      );
    }

    // ── 4. Delete file from Storage (service role — guaranteed permission) ─────
    if (fileUrl) {
      const { error: storageError } = await supabaseAdmin.storage
        .from("payment-receipts")
        .remove([fileUrl]);
      if (storageError) {
        // Log but don't fail — DB is already updated
        console.error("[notify-rejection] Storage delete error:", storageError.message);
      }
    }

    // ── 5. Fetch installment + loan + borrower details ─────────────────────────
    const { data: inst, error: instError } = await supabaseAdmin
      .from("installments")
      .select(
        `
        installment_no,
        loans!installments_loan_id_fkey (
          credit_sources!loans_source_id_fkey ( name ),
          borrower:profiles!loans_borrower_id_fkey ( id, full_name )
        )
      `
      )
      .eq("id", installmentId)
      .single();

    if (instError || !inst) {
      console.error("[notify-rejection] Installment fetch error:", instError?.message);
      return Response.json(
        { error: "Installment not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const loan = inst.loans as {
      credit_sources: { name: string };
      borrower: { id: string; full_name: string };
    };
    const borrowerId = loan.borrower.id;
    const borrowerName = loan.borrower.full_name;
    const sourceName = loan.credit_sources.name;
    const installmentNo = inst.installment_no;

    // ── 6. Get borrower email from auth.users ──────────────────────────────────
    const {
      data: { user: borrowerUser },
      error: borrowerError,
    } = await supabaseAdmin.auth.admin.getUserById(borrowerId);
    if (borrowerError || !borrowerUser?.email) {
      console.error("[notify-rejection] Borrower email fetch error:", borrowerError?.message);
      return Response.json(
        { error: "Borrower email not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // ── 7. Send rejection email via Brevo ──────────────────────────────────────
    const brevoKey = Deno.env.get("BREVO_API_KEY");

    if (!brevoKey) {
      console.warn("[notify-rejection] BREVO_API_KEY not set — skipping email");
      return Response.json({ ok: true, email_sent: false }, { headers: corsHeaders });
    }

    const fromEmail = Deno.env.get("BREVO_FROM_EMAIL") ?? "noreply@loantracker.app";
    const fromName = Deno.env.get("BREVO_FROM_NAME") ?? "Loan Tracker";

    const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: borrowerUser.email, name: borrowerName }],
        subject: `Payment proof rejected — ${sourceName} Installment #${installmentNo}`,
        htmlContent: buildRejectionEmail(borrowerName, sourceName, installmentNo, adminNote),
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("[notify-rejection] Resend error:", errText);
      // Don't fail the response — file deletion already succeeded
      return Response.json(
        { ok: true, email_sent: false, email_error: errText },
        { headers: corsHeaders }
      );
    }

    return Response.json({ ok: true, email_sent: true }, { headers: corsHeaders });
  } catch (err) {
    console.error("[notify-rejection] Unexpected error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
});

function buildRejectionEmail(
  borrowerName: string,
  sourceName: string,
  installmentNo: number,
  reason: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px 16px;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">

    <!-- Header -->
    <div style="background:#1f1010;border-bottom:1px solid #3a2020;padding:24px 28px;">
      <p style="margin:0 0 6px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">Loan Tracker</p>
      <h1 style="margin:0;font-size:20px;color:#f87171;font-weight:600;">Payment Proof Rejected</h1>
    </div>

    <!-- Body -->
    <div style="padding:28px;">
      <p style="margin:0 0 16px;font-size:14px;color:#bbb;line-height:1.6;">
        Hi <strong style="color:#e5e5e5;">${borrowerName}</strong>,
      </p>
      <p style="margin:0 0 20px;font-size:14px;color:#bbb;line-height:1.6;">
        Your payment proof for
        <strong style="color:#e5e5e5;">${sourceName} — Installment #${installmentNo}</strong>
        has been reviewed and <strong style="color:#f87171;">rejected</strong>.
        The attached file has been removed from our records.
      </p>

      <!-- Reason box -->
      <div style="background:#2a1515;border:1px solid #4a2020;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Reason</p>
        <p style="margin:0;font-size:14px;color:#fca5a5;line-height:1.6;">${reason}</p>
      </div>

      <p style="margin:0 0 8px;font-size:14px;color:#bbb;line-height:1.6;">
        Please review the reason above. If your payment was made correctly, resubmit your proof through the app.
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
