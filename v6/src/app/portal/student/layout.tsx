"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getStudentProfileStatus } from "@/lib/actions/profile";
import { Loader2 } from "lucide-react";

export default function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/login");
      return;
    }

    const email = session.user.email;
    if (email) {
      getStudentProfileStatus(email).then((statusInfo) => {
        if (statusInfo) {
          const isAwaitingApprovalPath = pathname === "/portal/student/awaiting-approval";
          
          if (!statusInfo.financeApproved || statusInfo.status !== "ACTIVE") {
            if (!isAwaitingApprovalPath) {
              router.push("/portal/student/awaiting-approval");
            } else {
              setChecking(false);
            }
          } else {
            if (isAwaitingApprovalPath) {
              router.push("/portal/student");
            } else {
              setChecking(false);
            }
          }
        } else {
          setChecking(false);
        }
      });
    } else {
      setChecking(false);
    }
  }, [session, status, pathname, router]);

  if (checking || status === "loading") {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  return <>{children}</>;
}
