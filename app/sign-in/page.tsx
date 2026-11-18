import { redirect } from "next/navigation";
import { AuthForm } from "@/src/features/auth/components/AuthForm";
import { getSession } from "@/src/lib/session";

export const metadata = { title: "Sign in · CollectorHub" };

export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect("/collection");

  return <AuthForm mode="sign-in" />;
}
