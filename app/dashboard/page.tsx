import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,user_role,first_name,last_name,onboarding_completed,ascent_id")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) redirect("/onboarding");

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="ascent-bg min-h-screen px-6 py-10">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-white/55">Ascent Dashboard</p>
            <h1 className="mt-3 text-4xl font-black">Welcome, {profile.first_name}</h1>
            <p className="mt-2 text-white/65">Role: {profile.user_role} · Ascent ID: {profile.ascent_id ?? "Not assigned"}</p>
          </div>
          <form action={signOut}>
            <button className="rounded-2xl border border-white/20 px-5 py-3 text-sm font-bold text-white/80" type="submit">
              Sign Out
            </button>
          </form>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="ascent-card rounded-3xl p-6">
            <p className="text-sm text-white/55">Next Build</p>
            <h2 className="mt-2 text-2xl font-black">Role Dashboard</h2>
            <p className="mt-3 text-sm text-white/65">Trainer, athlete, parent, and scout dashboards branch from here.</p>
          </div>
          <div className="ascent-card rounded-3xl p-6">
            <p className="text-sm text-white/55">Backend</p>
            <h2 className="mt-2 text-2xl font-black">Supabase Live</h2>
            <p className="mt-3 text-sm text-white/65">Auth session and profile data are loaded from your shared backend.</p>
          </div>
          <div className="ascent-card rounded-3xl p-6">
            <p className="text-sm text-white/55">Product</p>
            <h2 className="mt-2 text-2xl font-black">Ready for Flows</h2>
            <p className="mt-3 text-sm text-white/65">Next: trainer dashboard, roster, assignments, and activity visibility.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
