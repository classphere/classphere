"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ResultsRedirect() {
  const router = useRouter();
  const params = useParams();
  
  useEffect(() => {
    if (params?.id) {
      router.replace(`/student/results/${params.id}`);
    } else {
      router.replace("/student/history");
    }
  }, [router, params]);

  return null;
}
