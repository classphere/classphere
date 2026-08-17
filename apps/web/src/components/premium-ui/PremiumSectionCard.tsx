import React from "react";
import { SectionCard } from "../ui/SectionCard";

interface PremiumSectionCardProps {
  title?: React.ReactNode | string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: "default" | "none" | "large";
}

/**
 * Thin alias over ui/SectionCard — see PremiumCard/Card for why this exists
 * as an alias rather than a second implementation. SectionCard already
 * carried the more complete responsive fixes (header wraps on phones,
 * headerRight goes full-width when stacked), so it's the one kept.
 */
export function PremiumSectionCard(props: PremiumSectionCardProps) {
  return <SectionCard {...props} />;
}

export default PremiumSectionCard;
