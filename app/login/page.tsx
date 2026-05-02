"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "signup";

function calculateAge(birthDate: string) {
  if (!birthDate) return 0;
  const today = new Date();
  const dob = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  function resetMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirmPassword("");
    setIsAgeVerified(false);
  }

  function verifyAge() {
    if (calculateAge(birthDate) < 13) {
      setError("You must be at least 13 years old to create an account.");
      return;
    }
    setError(null);
    setIsAgeVerified(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (isSignup) {
        if (!isAgeVerified) {
          setError("Please verify age first.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
            data: { birth_date: birthDate },
          },
        });

        if (error) throw error;

        if (data.session) {
          router.push("/onboarding");
        } else {
          setNotice("Check your email to confirm your account, then log in.");
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ascent-bg flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex justify-center">
            <img
              src="ascent-logo.png"
              alt="Ascent Athletix"
              className="h-20 w-auto"
            />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-white/60">Ascent Athletix</p>
          <h1 className="mt-3 text-3xl font-black">{isSignup ? "Join the Team" : "Welcome Back"}</h1>
          <p className="mt-2 text-sm text-white/65">Track the work. Prove the development.</p>
        </div>

        <div className="ascent-card rounded-[2rem] p-7">
          {isSignup && !isAgeVerified ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold">Verify your age</h2>
                <p className="mt-2 text-sm text-white/65">You must be at least 13 years old to create an account.</p>
              </div>
              <input className="ascent-input" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              {error && <p className="text-sm text-red-300">{error}</p>}
              <button className="ascent-button w-full rounded-2xl px-5 py-4" onClick={verifyAge} type="button">
                Continue
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <input className="ascent-input" placeholder="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input className="ascent-input" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {isSignup && (
                <input className="ascent-input" placeholder="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              )}
              {!isSignup && <p className="text-right text-xs text-white/55">Forgot Password?</p>}
              {error && <p className="text-sm text-red-300">{error}</p>}
              {notice && <p className="text-sm text-emerald-200">{notice}</p>}
              <button className="ascent-button w-full rounded-2xl px-5 py-4" disabled={loading} type="submit">
                {loading ? "Working..." : isSignup ? "Create Account" : "Log In"}
              </button>
            </form>
          )}
        </div>

        <button className="mt-8 w-full text-center text-sm text-white/70" onClick={() => resetMode(isSignup ? "login" : "signup")} type="button">
          {isSignup ? "Already have an account? " : "New here? "}
          <span className="font-extrabold text-white">{isSignup ? "Log In" : "Get Started"}</span>
        </button>
      </section>
    </main>
  );
}
