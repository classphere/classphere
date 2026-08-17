import React from "react";
import { PremiumCard } from "../premium-ui/PremiumCard";

type CardVariant = "default" | "transparent";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: "none" | "default" | "large";
}

/**
 * Thin alias over PremiumCard.
 *
 * This used to be a second, independently-tuned card implementation —
 * matching padding by hand whenever PremiumCard's changed, and drifting the
 * moment someone forgot. "default" here has always meant the same background
 * PremiumCard calls "light" (bg-b-surface2); no caller in this codebase ever
 * used the "light" variant this file used to also offer (bg-b-pop), so it's
 * not carried forward — there is now exactly one card implementation.
 */
export function Card({ variant = "default", padding = "default", ...props }: CardProps) {
  return <PremiumCard variant={variant === "default" ? "light" : "transparent"} padding={padding} {...props} />;
}

export default Card;
