import { useIsFetching } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Thin indeterminate progress bar rendered at the top of the content column.
 * Automatically visible whenever any React Query fetch is in-flight —
 * stays in sync with skeleton loaders without any extra wiring.
 */
export function GlobalLoadingBar() {
  const isFetching = useIsFetching();

  return (
    <div className="relative h-0.5 shrink-0 overflow-hidden">
      <AnimatePresence>
        {isFetching > 0 && (
          <motion.div
            key="bar"
            className="absolute inset-y-0 rounded-full bg-green-700"
            style={{ width: "45%" }}
            initial={{ left: "-45%" }}
            animate={{ left: "110%" }}
            exit={{ opacity: 0 }}
            transition={{
              left: { duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatType: "loop" },
              opacity: { duration: 0.25 },
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
