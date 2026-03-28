import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefetching: boolean;
  className?: string;
}

export function RefreshButton({ onRefresh, isRefetching, className }: RefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isRefetching}
      aria-label="Refresh"
      className={cn(
        "text-muted-foreground hover:text-foreground hover:bg-muted/50 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:pointer-events-none",
        className
      )}
    >
      <RefreshCw className={cn("h-4 w-4 transition-transform", isRefetching && "animate-spin")} />
    </button>
  );
}
