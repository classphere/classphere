"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function DomainRootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    // Redirect based on role
    switch (user.role) {
      case "super_admin":
        router.replace("/");
        break;
      case "institute_admin":
        router.replace("/institute");
        break;
      case "teacher":
        router.replace("/teacher");
        break;
      default:
        router.replace("/student/dashboard");
        break;
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-b-surface1">
      <span className="size-8 border-2 border-primary-01/30 border-t-primary-01 rounded-full animate-spin" />
    </div>
  );
}
