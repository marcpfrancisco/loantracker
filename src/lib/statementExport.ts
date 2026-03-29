import type { BorrowerStatement, StatementLoan } from "@/hooks/useBorrowerStatement";
import type { ExpenseTabDetail } from "@/hooks/useExpenseTab";

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_LABEL: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  unpaid: "Unpaid",
  active: "Active",
  completed: "Completed",
  defaulted: "Defaulted",
  cancelled: "Cancelled",
};

const LOAN_TYPE_LABEL: Record<string, string> = {
  maribank_credit: "Maribank Credit",
  sloan: "S-Loan",
  gloan: "G-Loan",
  spaylater: "SPayLater",
  tabby: "Tabby",
  credit_card: "Credit Card",
  lazcredit: "LazCredit",
  custom: "Custom",
};

// ── CSV Export ────────────────────────────────────────────────────────────────

export function exportStatementCSV(statement: BorrowerStatement): void {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

  const rows: string[][] = [
    ["Loan Statement", statement.borrower.full_name],
    ["Region", statement.borrower.region],
    ["Generated", statement.generatedAt],
    [],
    [
      "Loan #",
      "Credit Source",
      "Loan Type",
      "Currency",
      "Principal",
      "Interest Rate %",
      "Service Fee",
      "Total Repayable",
      "Loan Status",
      "Started",
      "Ended",
      "Installment #",
      "Due Date",
      "Amount",
      "Payment Status",
      "Paid Date",
    ],
  ];

  statement.loans.forEach((loan, idx) => {
    loan.installments.forEach((inst) => {
      rows.push([
        String(idx + 1),
        loan.credit_source.name,
        LOAN_TYPE_LABEL[loan.loan_type] ?? loan.loan_type,
        loan.currency,
        String(loan.principal),
        loan.interest_rate !== null ? String(loan.interest_rate) : "",
        String(loan.service_fee),
        String(loan.totalRepayable),
        STATUS_LABEL[loan.status] ?? loan.status,
        loan.started_at,
        loan.ended_at ?? "",
        String(inst.installment_no),
        inst.due_date,
        String(inst.amount),
        STATUS_LABEL[inst.status] ?? inst.status,
        inst.paid_at ?? "",
      ]);
    });
  });

  const csv = rows.map((row) => (row.length === 0 ? "" : row.map(escape).join(","))).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `loan-statement-${statement.borrower.full_name
    .toLowerCase()
    .replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF via Print Window ──────────────────────────────────────────────────────

function loanSection(loan: StatementLoan, index: number): string {
  const statusColor: Record<string, string> = {
    paid: "#16a34a",
    pending: "#d97706",
    unpaid: "#9ca3af",
  };
  const loanStatusColor: Record<string, string> = {
    active: "#3b82f6",
    completed: "#16a34a",
    defaulted: "#ef4444",
    cancelled: "#9ca3af",
  };

  const rows = loan.installments
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 12px;text-align:center;color:#374151;border-bottom:1px solid #f3f4f6;">${i.installment_no}</td>
        <td style="padding:8px 12px;color:#374151;border-bottom:1px solid #f3f4f6;">${fmtDate(i.due_date)}</td>
        <td style="padding:8px 12px;text-align:right;color:#111827;font-weight:600;border-bottom:1px solid #f3f4f6;">${fmt(i.amount, loan.currency)}</td>
        <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #f3f4f6;">
          <span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:600;background:${statusColor[i.status] ?? "#9ca3af"}20;color:${statusColor[i.status] ?? "#9ca3af"};">
            ${STATUS_LABEL[i.status] ?? i.status}
          </span>
        </td>
        <td style="padding:8px 12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${i.paid_at ? fmtDate(i.paid_at) : "—"}</td>
      </tr>`
    )
    .join("");

  return `
    <div style="margin-bottom:28px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;break-inside:avoid;">
      <!-- Loan header -->
      <div style="background:#f9fafb;padding:14px 18px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <span style="font-weight:700;color:#111827;font-size:14px;">Loan ${index + 1} — ${loan.credit_source.name}</span>
        <span style="font-size:12px;color:#6b7280;">${LOAN_TYPE_LABEL[loan.loan_type] ?? loan.loan_type}</span>
        <span style="margin-left:auto;display:inline-block;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:600;background:${loanStatusColor[loan.status] ?? "#9ca3af"}20;color:${loanStatusColor[loan.status] ?? "#9ca3af"};">
          ${STATUS_LABEL[loan.status] ?? loan.status}
        </span>
      </div>
      <!-- Financial summary -->
      <div style="padding:12px 18px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;gap:24px;flex-wrap:wrap;font-size:13px;">
        <div><span style="color:#6b7280;">Principal</span>&nbsp;&nbsp;<strong style="color:#111827;">${fmt(loan.principal, loan.currency)}</strong></div>
        ${loan.interest_rate !== null ? `<div><span style="color:#6b7280;">Rate</span>&nbsp;&nbsp;<strong style="color:#111827;">${loan.interest_rate}%</strong></div>` : ""}
        ${loan.service_fee > 0 ? `<div><span style="color:#6b7280;">Fee</span>&nbsp;&nbsp;<strong style="color:#111827;">${fmt(loan.service_fee, loan.currency)}</strong></div>` : ""}
        <div><span style="color:#6b7280;">Total Repayable</span>&nbsp;&nbsp;<strong style="color:#111827;">${fmt(loan.totalRepayable, loan.currency)}</strong></div>
        <div><span style="color:#6b7280;">Paid</span>&nbsp;&nbsp;<strong style="color:#16a34a;">${fmt(loan.totalPaid, loan.currency)}</strong></div>
        <div><span style="color:#6b7280;">Outstanding</span>&nbsp;&nbsp;<strong style="color:${loan.totalOutstanding > 0 ? "#d97706" : "#16a34a"};">${fmt(loan.totalOutstanding, loan.currency)}</strong></div>
        <div><span style="color:#6b7280;">Started</span>&nbsp;&nbsp;<strong style="color:#111827;">${fmtDate(loan.started_at)}</strong></div>
        ${loan.ended_at ? `<div><span style="color:#6b7280;">Ended</span>&nbsp;&nbsp;<strong style="color:#111827;">${fmtDate(loan.ended_at)}</strong></div>` : ""}
      </div>
      <!-- Installments table -->
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">#</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Due Date</th>
            <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Amount</th>
            <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Status</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Paid Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

export function printStatementPDF(statement: BorrowerStatement): void {
  const hasPHP = statement.summary.PHP.principal > 0;
  const hasAED = statement.summary.AED.principal > 0;

  const summaryRows = [
    hasPHP &&
      `
      <tr>
        <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #f3f4f6;">Total Principal (PHP)</td>
        <td style="padding:10px 16px;text-align:right;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${fmt(statement.summary.PHP.principal, "PHP")}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #f3f4f6;">Total Paid (PHP)</td>
        <td style="padding:10px 16px;text-align:right;font-weight:600;color:#16a34a;border-bottom:1px solid #f3f4f6;">${fmt(statement.summary.PHP.paid, "PHP")}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #f3f4f6;">Outstanding (PHP)</td>
        <td style="padding:10px 16px;text-align:right;font-weight:700;color:${statement.summary.PHP.outstanding > 0 ? "#d97706" : "#16a34a"};border-bottom:1px solid #f3f4f6;">${fmt(statement.summary.PHP.outstanding, "PHP")}</td>
      </tr>`,
    hasAED &&
      `
      <tr>
        <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #f3f4f6;">Total Principal (AED)</td>
        <td style="padding:10px 16px;text-align:right;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${fmt(statement.summary.AED.principal, "AED")}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #f3f4f6;">Total Paid (AED)</td>
        <td style="padding:10px 16px;text-align:right;font-weight:600;color:#16a34a;border-bottom:1px solid #f3f4f6;">${fmt(statement.summary.AED.paid, "AED")}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;color:#374151;">Outstanding (AED)</td>
        <td style="padding:10px 16px;text-align:right;font-weight:700;color:${statement.summary.AED.outstanding > 0 ? "#d97706" : "#16a34a"};">${fmt(statement.summary.AED.outstanding, "AED")}</td>
      </tr>`,
  ]
    .filter(Boolean)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Loan Statement — ${statement.borrower.full_name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #111827; padding: 40px 48px; font-size: 14px; }
    @media print {
      body { padding: 24px 32px; }
      @page { margin: 0.75in; size: A4; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #111827;">
    <div>
      <p style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Global Loan Tracker</p>
      <h1 style="font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.02em;">Loan Statement</h1>
    </div>
    <div style="text-align:right;">
      <p style="font-size:13px;font-weight:600;color:#111827;">${statement.borrower.full_name}</p>
      <p style="font-size:12px;color:#6b7280;margin-top:2px;">Region: ${statement.borrower.region}</p>
      <p style="font-size:11px;color:#9ca3af;margin-top:6px;">Generated ${statement.generatedAt}</p>
    </div>
  </div>

  <!-- Loans -->
  <div style="margin-bottom:32px;">
    <h2 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;">
      ${statement.loans.length} Loan${statement.loans.length !== 1 ? "s" : ""}
    </h2>
    ${statement.loans.map((loan, i) => loanSection(loan, i)).join("")}
  </div>

  <!-- Summary -->
  <div style="break-inside:avoid;">
    <h2 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">Summary</h2>
    <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tbody>${summaryRows}</tbody>
      </table>
    </div>
  </div>

  <!-- Footer -->
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:11px;color:#9ca3af;">
    <span>Global Loan Tracker — Confidential</span>
    <span>Generated ${statement.generatedAt}</span>
  </div>

  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

// ── Expense Tab CSV ───────────────────────────────────────────────────────────

export function exportExpenseTabCSV(tab: ExpenseTabDetail): void {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const generatedAt = new Date().toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const rows: string[][] = [
    ["Expense Tab Statement", tab.title],
    ["Borrower", tab.borrower.full_name],
    ["Currency", tab.currency],
    ["Generated", generatedAt],
    [],
    // Items header
    ["— ITEMS —"],
    ["Month", "Date", "Description", "Total Amount", "Split", `Borrower Owes (${tab.currency})`],
  ];

  for (const period of tab.periods) {
    const monthLabel = new Date(period.period + "T12:00:00").toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    for (const item of period.items) {
      rows.push([
        monthLabel,
        item.entry_date,
        item.description,
        String(item.amount),
        item.is_already_split ? "His share" : "÷ 2",
        String(item.borrower_owes),
      ]);
    }
  }

  rows.push([], ["— PAYMENTS —"], ["Month", "Payment Date", "Amount", "Notes"]);

  for (const period of tab.periods) {
    const monthLabel = new Date(period.period + "T12:00:00").toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    for (const payment of period.payments) {
      rows.push([monthLabel, payment.payment_date, String(payment.amount), payment.notes ?? ""]);
    }
  }

  rows.push(
    [],
    ["— SUMMARY —"],
    ["Total Charged", String(tab.total_owed)],
    ["Total Paid", String(tab.total_paid)],
    ["Outstanding", String(tab.outstanding)]
  );

  const csv = rows.map((row) => (row.length === 0 ? "" : row.map(escape).join(","))).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expense-tab-${tab.borrower.full_name.toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Expense Tab PDF ───────────────────────────────────────────────────────────

export function printExpenseTabPDF(tab: ExpenseTabDetail): void {
  const generatedAt = new Date().toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const paidStatusColor: Record<string, string> = {
    paid: "#16a34a",
    partial: "#d97706",
    unpaid: "#9ca3af",
  };
  const paidStatusLabel: Record<string, string> = {
    paid: "Paid",
    partial: "Partial",
    unpaid: "Unpaid",
  };

  const periodSections = tab.periods
    .map((period) => {
      const monthLabel = new Date(period.period + "T12:00:00").toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      const color = paidStatusColor[period.paid_status] ?? "#9ca3af";
      const label = paidStatusLabel[period.paid_status] ?? period.paid_status;

      const itemRows = period.items
        .map(
          (item) => `
      <tr>
        <td style="padding:8px 12px;color:#374151;border-bottom:1px solid #f3f4f6;">${item.description}</td>
        <td style="padding:8px 12px;color:#6b7280;border-bottom:1px solid #f3f4f6;font-size:12px;">${item.entry_date}</td>
        <td style="padding:8px 12px;text-align:right;color:#374151;border-bottom:1px solid #f3f4f6;">${fmt(item.amount, tab.currency)}</td>
        <td style="padding:8px 12px;text-align:center;color:#6b7280;border-bottom:1px solid #f3f4f6;font-size:12px;">${item.is_already_split ? "His share" : "÷ 2"}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${fmt(item.borrower_owes, tab.currency)}</td>
      </tr>`
        )
        .join("");

      const paymentRows = period.payments
        .map(
          (pay) => `
      <tr style="background:#f0fdf4;">
        <td colspan="4" style="padding:8px 12px;color:#16a34a;border-bottom:1px solid #f3f4f6;">
          Payment received · ${fmtDate(pay.payment_date)}${pay.notes ? ` · ${pay.notes}` : ""}
        </td>
        <td style="padding:8px 12px;text-align:right;font-weight:600;color:#16a34a;border-bottom:1px solid #f3f4f6;">-${fmt(pay.amount, tab.currency)}</td>
      </tr>`
        )
        .join("");

      return `
    <div style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;break-inside:avoid;">
      <div style="background:#f9fafb;padding:12px 18px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-weight:700;color:#111827;font-size:14px;">${monthLabel}</span>
        <div style="display:flex;align-items:center;gap:16px;">
          <span style="font-size:12px;color:#6b7280;">Charged <strong style="color:#111827;">${fmt(period.total_owed, tab.currency)}</strong></span>
          <span style="font-size:12px;color:#16a34a;">Paid <strong>${fmt(period.total_paid, tab.currency)}</strong></span>
          <span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:600;background:${color}20;color:${color};">${label}</span>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:7px 12px;text-align:left;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Description</th>
            <th style="padding:7px 12px;text-align:left;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Date</th>
            <th style="padding:7px 12px;text-align:right;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Total</th>
            <th style="padding:7px 12px;text-align:center;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Split</th>
            <th style="padding:7px 12px;text-align:right;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Owes</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows || `<tr><td colspan="5" style="padding:16px 12px;text-align:center;color:#9ca3af;font-size:12px;">No items</td></tr>`}
          ${paymentRows}
          ${
            period.total_owed > 0
              ? `
          <tr style="background:#f9fafb;">
            <td colspan="4" style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">Outstanding</td>
            <td style="padding:8px 12px;text-align:right;font-weight:700;color:${period.outstanding <= 0 ? "#16a34a" : "#111827"};">${fmt(period.outstanding, tab.currency)}</td>
          </tr>`
              : ""
          }
        </tbody>
      </table>
    </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Expense Statement — ${tab.borrower.full_name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #111827; padding: 40px 48px; font-size: 14px; }
    @media print {
      body { padding: 24px 32px; }
      @page { margin: 0.75in; size: A4; }
    }
  </style>
</head>
<body>
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #111827;">
    <div>
      <p style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Global Loan Tracker</p>
      <h1 style="font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.02em;">Expense Statement</h1>
      <p style="font-size:13px;color:#6b7280;margin-top:4px;">${tab.title}</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:13px;font-weight:600;color:#111827;">${tab.borrower.full_name}</p>
      <p style="font-size:12px;color:#6b7280;margin-top:2px;">Currency: ${tab.currency}</p>
      <p style="font-size:11px;color:#9ca3af;margin-top:6px;">Generated ${generatedAt}</p>
    </div>
  </div>

  <div style="margin-bottom:28px;">
    <h2 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;">
      ${tab.periods.length} Month${tab.periods.length !== 1 ? "s" : ""}
    </h2>
    ${periodSections || `<p style="color:#9ca3af;font-size:13px;">No expense periods recorded.</p>`}
  </div>

  <div style="break-inside:avoid;">
    <h2 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">Summary</h2>
    <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tbody>
          <tr><td style="padding:10px 16px;color:#374151;border-bottom:1px solid #f3f4f6;">Total Charged</td><td style="padding:10px 16px;text-align:right;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${fmt(tab.total_owed, tab.currency)}</td></tr>
          <tr><td style="padding:10px 16px;color:#374151;border-bottom:1px solid #f3f4f6;">Total Paid</td><td style="padding:10px 16px;text-align:right;font-weight:600;color:#16a34a;border-bottom:1px solid #f3f4f6;">${fmt(tab.total_paid, tab.currency)}</td></tr>
          <tr><td style="padding:10px 16px;color:#374151;">Outstanding</td><td style="padding:10px 16px;text-align:right;font-weight:700;color:${tab.outstanding > 0 ? "#d97706" : "#16a34a"};">${fmt(tab.outstanding, tab.currency)}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:11px;color:#9ca3af;">
    <span>Global Loan Tracker — Confidential</span>
    <span>Generated ${generatedAt}</span>
  </div>

  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
