import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { profile, signOut } = useAuth();

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Global Loan Tracker</h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {profile?.full_name} · {profile?.role} · {profile?.region}
          </p>
        </div>
        <button
          onClick={() => void signOut()}
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          Sign out
        </button>
      </header>
      <main className="p-6">
        <p className="text-muted-foreground text-sm">Dashboard — coming soon.</p>
      </main>
    </div>
  );
}
