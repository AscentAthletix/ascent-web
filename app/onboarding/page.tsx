import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingClient from "./onboarding-client";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,user_role,first_name,last_name,onboarding_completed")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) redirect("/dashboard");

  return <OnboardingClient userId={userData.user.id} email={userData.user.email ?? ""} initialProfile={profile} />;
}
