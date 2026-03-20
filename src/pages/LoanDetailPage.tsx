import { useParams } from "react-router";

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="bg-background flex h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Loan {id} — coming soon.</p>
    </div>
  );
}
