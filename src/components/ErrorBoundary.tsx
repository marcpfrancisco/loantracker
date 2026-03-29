import { Component, type ReactNode } from "react";
import { useRouteError, useNavigate, isRouteErrorResponse } from "react-router";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

// ── Route Error Page ───────────────────────────────────────────────────────────
// Used as `errorElement` in the router — catches loader errors and 404s.

export function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Something went wrong";
  let message = "An unexpected error occurred. Please try again.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Page not found";
      message = "The page you're looking for doesn't exist.";
    } else if (error.status === 403) {
      title = "Access denied";
      message = "You don't have permission to view this page.";
    } else {
      message = error.statusText || message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return <ErrorUI title={title} message={message} onGoHome={() => void navigate("/dashboard")} />;
}

// ── Class Error Boundary ───────────────────────────────────────────────────────
// Wraps the app to catch unexpected render/runtime errors.

interface ErrorBoundaryState {
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  handleReset = () => {
    this.setState({ error: null });
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.error) {
      return (
        <ErrorUI
          title="Something went wrong"
          message={this.state.error.message}
          onGoHome={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

// ── Shared Error UI ────────────────────────────────────────────────────────────

function ErrorUI({
  title,
  message,
  onGoHome,
}: {
  title: string;
  message: string;
  onGoHome: () => void;
}) {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
          <AlertTriangle className="h-8 w-8 text-rose-400" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-foreground text-xl font-semibold">{title}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => window.location.reload()}
            className="border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <button
            onClick={onGoHome}
            className="bg-primary text-primary-foreground flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
