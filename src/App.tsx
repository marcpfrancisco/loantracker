import { useAuth } from "@/context/AuthContext";

export default function App() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Not authenticated.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">
          Global Loan Tracker
        </h1>
        <p className="text-muted-foreground text-xs mt-0.5">
          {profile?.full_name} · {profile?.role} · {profile?.region}
        </p>
      </header>

      <main className="p-6">
        <p className="text-muted-foreground text-sm">Dashboard coming soon.</p>
      </main>
    </div>
  );
}
