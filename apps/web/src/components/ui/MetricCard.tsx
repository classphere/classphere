import React from "react";
import { PremiumMetricCard, PremiumMetricGrid } from "../premium-ui/PremiumMetricCard";

interface MetricCardProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  badge?: React.ReactNode;
  badgeLabel?: string;
  className?: string;
}

/**
 * Thin alias over PremiumMetricCard — see Card/PremiumCard for why. This
 * used to run its own larger type scale (42px values vs PremiumMetricCard's
 * 26px) and its own badge-row bug (no reserved height, so a card with a
 * badge grew taller than its siblings in the same row). Both are fixed by
 * pointing here instead of maintaining a second implementation.
 */
export function MetricCard(props: MetricCardProps) {
  return <PremiumMetricCard {...props} />;
}

export function MetricGrid(props: { children: React.ReactNode; cols?: 2 | 3 | 4; className?: string }) {
  return <PremiumMetricGrid {...props} />;
}

export default MetricCard;
