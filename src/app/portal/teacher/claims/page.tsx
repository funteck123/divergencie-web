"use client";
// redirect to unified payment-claims page
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TeacherClaimsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/portal/teacher/payment-claims"); }, []);
  return null;
}
