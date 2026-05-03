import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/app");
  return (
    <main className="flex min-h-screen items-center justify-center bg-linen px-4">
      <AuthForm mode="register" />
    </main>
  );
}
