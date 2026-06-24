import { Loader2 } from "lucide-react";

export function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" aria-label="Loading page" />
    </div>
  );
}
