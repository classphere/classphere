import Link from "next/link";
import { RiErrorWarningLine } from "@remixicon/react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <RiErrorWarningLine size={48} className="text-t-tertiary" />
      <h2 className="text-3xl font-bold text-t-primary">404</h2>
      <p className="text-t-secondary">This page does not exist or has been moved.</p>
      <Link href="/" className="btn btn-primary mt-2">
        Go Home
      </Link>
    </div>
  );
}
