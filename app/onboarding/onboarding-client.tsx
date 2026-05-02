"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Role = "athlete" | "trainer" | "parent" | "scout";

type Profile = {
  id: string;
  email?: string | null;
  user_role?: Role | null;
  first_name?: string | null;
  last_name?: string | null;
  onboarding_completed?: boolean | null;
} | null;

const roles: Array<{ role: Role; title: string; description: string; icon: string }> = [
  { role: "athlete", title: "Athlete", description: "Track work, define direction, and build your development system.", icon: "⚾" },
  { role: "trainer", title: "Coach / Trainer", description: "Build programs, connect athletes, and guide development.", icon: "⏱" },
  { role: "parent", title: "Parent", description: "Follow your athlete’s progress and stay connected.", icon: "👥" },
  { role: "scout", title: "Scout", description: "Review verified development profiles and athlete progress.", icon: "📋" },
];

function generateAscentId(role: Role) {
  const prefix = role === "athlete" ? "A" : role === "trainer" ? "T" : role === "parent" ? "P" : "S";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${prefix}-${random}`;
}

export default function OnboardingClient({ userId, email, initialProfile }: { userId: string; email: string; initialProfile: Profile }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [selectedRole, setSelectedRole] = useState<Role | null>((initialProfile?.user_role as Role | null) ?? null);
  const [firstName, setFirstName] = useState(initialProfile?.first_name ?? "");
  const [lastName, setLastName] = useState(initialProfile?.last_name ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function chooseRole(role: Role) {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        email,
        user_role: role,
        ascent_id: initialProfile?.user_role ? undefined : generateAscentId(role),
        onboarding_completed: false,
      });
      if (error) throw error;
      setSelectedRole(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save role.");
    } finally {
      setLoading(false);
    }
  }

  async function completeOnboarding() {
    if (!selectedRole) return;
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        email,
        user_role: selectedRole,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        onboarding_completed: true,
      });
      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete onboarding.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ascent-bg min-h-screen px-6 py-10">
      <section className="mx-auto max-w-4xl">
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-white/55">Ascent Onboarding</p>
          <h1 className="mt-3 text-4xl font-black">Choose your path</h1>
          <p className="mt-3 max-w-2xl text-white/65">Set up the role and basic identity that drives the web dashboard experience.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {roles.map((item) => {
            const active = selectedRole === item.role;
            return (
              <button
                key={item.role}
                className={`ascent-card rounded-3xl p-6 text-left transition ${active ? "ring-2 ring-[var(--ascent-green)]" : "hover:bg-white/12"}`}
                disabled={loading}
                onClick={() => chooseRole(item.role)}
                type="button"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl">{item.icon}</div>
                <h2 className="text-xl font-extrabold">{item.title}</h2>
                <p className="mt-2 text-sm text-white/65">{item.description}</p>
              </button>
            );
          })}
        </div>

        {selectedRole && (
          <div className="ascent-card mt-8 rounded-3xl p-6">
            <h2 className="text-2xl font-black">Basic profile</h2>
            <p className="mt-2 text-sm text-white/60">This mirrors the profile setup flow in the iOS app.</p>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <input className="ascent-input" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <input className="ascent-input" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            {error && <p className="mt-5 text-sm text-red-300">{error}</p>}
            <button className="ascent-button mt-6 rounded-2xl px-6 py-4" disabled={loading} onClick={completeOnboarding} type="button">
              {loading ? "Saving..." : "Continue to Dashboard"}
            </button>
          </div>
        )}

        {!selectedRole && error && <p className="mt-5 text-sm text-red-300">{error}</p>}
      </section>
    </main>
  );
}
