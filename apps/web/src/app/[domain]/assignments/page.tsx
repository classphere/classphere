"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function AssignmentsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/student/assignments"); }, [router]);
  return null;
}
