import type { Variants } from "framer-motion";

// Luxury expo-out easing — used for card entrance and page transitions.
// Must be typed as a 4-tuple to satisfy framer-motion's CubicBezierDefinition.
const expoOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: expoOut },
  },
  exit: { opacity: 0, y: -16, transition: { duration: 0.2 } },
};
