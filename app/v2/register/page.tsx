import { Suspense } from "react";
import { RegisterForm } from "@/ui2/features/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
