"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function AnalyticsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/student/analytics"); }, [router]);
  return null;
}
