"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { type Profile } from "@/lib/ascent";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id,email,user_role,onboarding_completed,first_name,last_name,ascent_id")
        .eq("id", userData.user.id)
        .maybeSingle<Profile>();

      if (!data || data.onboarding_completed !== true || !data.user_role) {
        router.replace("/onboarding");
        return;
      }

      setProfile(data);
      setLoading(false);
    }

    load();
  }, [router, supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="ascent-bg flex min-h-screen items-center justify-center px-6">
        <p className="font-bold text-white/75">Loading dashboard...</p>
      </main>
    );
  }

  const firstName = profile?.first_name || "Athlete";
  const role = profile?.user_role || "athlete";

  return (
    <main className="min-h-screen bg-[var(--field-white)] text-[var(--ascent-navy)]">
      <header className="bg-[var(--ascent-navy)] px-6 pb-8 pt-10 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.32em] text-white/55">Ascent Athletix</p>
            <h1 className="mt-2 text-3xl font-black">Welcome, {firstName}</h1>
            <p className="mt-1 text-sm font-semibold text-white/65">{String(role).toUpperCase()} Dashboard</p>
          </div>
          <button onClick={signOut} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-extrabold text-white/80" type="button">
            Sign Out
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="ascent-card-light rounded-[1.5rem] p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[rgba(7,26,44,0.48)]">Status</p>
            <h2 className="mt-2 text-2xl font-black">Active</h2>
          </div>
          <div className="ascent-card-light rounded-[1.5rem] p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[rgba(7,26,44,0.48)]">Ascent ID</p>
            <h2 className="mt-2 text-2xl font-black">{profile?.ascent_id ?? "—"}</h2>
          </div>
          <div className="ascent-card-light rounded-[1.5rem] p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[rgba(7,26,44,0.48)]">Next</p>
            <h2 className="mt-2 text-2xl font-black">Build Role UI</h2>
          </div>
        </div>
      </section>
    </main>
  );
}
