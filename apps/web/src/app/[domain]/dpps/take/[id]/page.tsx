"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function TakeDPPRedirect() {
  const router = useRouter();
  const params = useParams();
  
  useEffect(() => {
    if (params?.id) {
      router.replace(`/student/dpps/take/${params.id}`);
    } else {
      router.replace("/student/assignments");
    }
  }, [router, params]);

  return null;
}
