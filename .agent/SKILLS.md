# Domain Expertise: Loan Mechanics

## Loan Calculation Formulas

- **Tabby/Tamara (UAE):** `Total / 4`. 25% upfront, 3 subsequent monthly payments. Interest: 0%.
- **Sloan/Gloan (PH):** `(Principal * InterestRate) + ServiceFee`. Interest is usually flat, not reducing balance.
- **Credit Cards (General):** Calculate "Statement Date" vs. "Due Date" (usually 15-20 days grace).

## Currency Utilities

- **AED Format:** `new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' })`.
- **PHP Format:** `new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`.

## GRC (Governance, Risk, Compliance)

- All financial records must have an `audit_log` entry for any change in `total_amount_owed`.

## Frontend Capabilities

- **Dynamic Form State:** Use `react-hook-form` to watch "Template" selection and update "Installment" and "Interest" fields dynamically.
- **Luxury UI:** Implement "Glassmorphism" for cards and "Framer Motion" for state transitions (e.g., a loan card 'expanding' into a detailed ledger).
- **Currency Isolation:** Ensure the UI never mixes PHP and AED in the same list without clear headers or conversion.
