"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { dashboardPathForRole, generateAscentId, type UserRole } from "@/lib/ascent";

const roles: Array<{ value: UserRole; title: string; subtitle: string }> = [
  { value: "athlete", title: "Athlete", subtitle: "Track your work, development, and progress." },
  { value: "trainer", title: "Coach / Trainer", subtitle: "Manage athletes, plans, sessions, and accountability." },
  { value: "parent", title: "Parent", subtitle: "Follow athlete development and stay connected." },
  { value: "scout", title: "Scout", subtitle: "Evaluate verified development and athlete profiles." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name,last_name,user_role,onboarding_completed,dob")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.onboarding_completed === true && profile?.user_role) {
        router.replace(dashboardPathForRole(profile.user_role));
        return;
      }

      setFirstName(profile?.first_name ?? "");
      setLastName(profile?.last_name ?? "");
      setRole((profile?.user_role as UserRole) ?? null);
      setBirthDate(profile?.dob ?? window.localStorage.getItem("ascent_verified_birth_date") ?? "");
      setLoading(false);
    }

    load();
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("No active session. Please log in again.");
      if (!role) throw new Error("Select your role to continue.");
      if (!firstName.trim() || !lastName.trim()) throw new Error("First and last name are required.");

      const payload = {
        id: userData.user.id,
        email: userData.user.email,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        user_role: role,
        ascent_id: generateAscentId(role),
        dob: birthDate || null,
        onboarding_completed: true,
      };

      const { error: upsertError } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      if (upsertError) throw upsertError;

      window.localStorage.removeItem("ascent_verified_birth_date");
      router.replace(dashboardPathForRole(role));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete onboarding.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="ascent-bg flex min-h-screen items-center justify-center px-6">
        <div className="text-center text-white">
          <img src="/ascent-logo.png" alt="Ascent Athletix" className="mx-auto mb-8 w-28" />
          <p className="font-bold text-white/75">Loading profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--field-white)] text-[var(--ascent-navy)]">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-8">
        <div className="mb-8 flex gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-[var(--ascent-green)]" />
        </div>

        <header className="mb-7 text-center">
          <img src="/ascent-logo.png" alt="Ascent Athletix" className="mx-auto mb-5 w-24 rounded-3xl bg-[var(--ascent-navy)] p-4 shadow-xl" />
          <h1 className="text-3xl font-black tracking-tight">Set Up Your Profile</h1>
          <p className="mt-2 text-sm font-semibold text-[rgba(7,26,44,0.62)]">Choose your role so Ascent can take you to the right dashboard.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="ascent-card-light rounded-[2rem] p-5 sm:p-7">
            <h2 className="mb-4 text-lg font-black">Identity</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className="ascent-input-card" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <input className="ascent-input-card" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </section>

          <section className="ascent-card-light rounded-[2rem] p-5 sm:p-7">
            <h2 className="mb-4 text-lg font-black">I am joining Ascent as a...</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {roles.map((item) => (
                <button
                  key={item.value}
                  className="ascent-role-card"
                  data-selected={role === item.value}
                  onClick={() => setRole(item.value)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black">{item.title}</p>
                      <p className="mt-1 text-sm font-semibold text-[rgba(7,26,44,0.58)]">{item.subtitle}</p>
                    </div>
                    <span className={`mt-1 h-5 w-5 rounded-full border-2 ${role === item.value ? "border-[var(--ascent-green)] bg-[var(--ascent-green)]" : "border-[rgba(7,26,44,0.18)]"}`} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          {error && <p className="text-sm font-bold text-red-600">{error}</p>}

          <button className="ascent-primary-button" disabled={saving} type="submit">
            {saving ? "Setting up your profile..." : "Continue →"}
          </button>
        </form>
      </div>
    </main>
  );
}
