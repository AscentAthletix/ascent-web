"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { type Profile } from "@/lib/ascent";

type DashboardStats = {
  primary: number;
  secondary: number;
  tertiary: number;
  upcoming: Array<{ id: string; title: string; subtitle: string; status?: string }>;
};

const roleLabels: Record<string, string> = {
  trainer: "Coach Dashboard",
  coach: "Coach Dashboard",
  athlete: "Athlete Dashboard",
  parent: "Parent Dashboard",
  scout: "Scout Dashboard",
};

function displayName(profile: Profile | null) {
  const first = profile?.first_name?.trim();
  const last = profile?.last_name?.trim();
  const joined = [first, last].filter(Boolean).join(" ");
  return joined || "Ascent User";
}

function normalizeRole(role?: string | null) {
  const normalized = (role ?? "athlete").toLowerCase();
  return normalized === "coach" ? "trainer" : normalized;
}

function initials(profile: Profile | null) {
  const first = profile?.first_name?.[0] ?? "A";
  const last = profile?.last_name?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({ primary: 0, secondary: 0, tertiary: 0, upcoming: [] });
  const [loading, setLoading] = useState(true);
  const [dataNotice, setDataNotice] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id,email,user_role,onboarding_completed,first_name,last_name,ascent_id")
        .eq("id", userData.user.id)
        .maybeSingle<Profile>();

      if (profileError) {
        setDataNotice(profileError.message);
        setLoading(false);
        return;
      }

      if (!profileData || profileData.onboarding_completed !== true || !profileData.user_role) {
        router.replace("/onboarding");
        return;
      }

      setProfile(profileData);
      const role = normalizeRole(profileData.user_role);
      const userId = userData.user.id;

      const loadedStats = await loadStats(role, userId);
      setStats(loadedStats);
      setLoading(false);
    }

    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function countRows(table: string, column: string, value: string, extra?: { column: string; value: string }) {
    try {
      let query = supabase.from(table).select("id", { count: "exact", head: true }).eq(column, value);
      if (extra) query = query.eq(extra.column, extra.value);
      const { count } = await query;
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  async function loadUpcomingByColumn(table: string, column: string, value: string) {
    try {
      const { data } = await supabase
        .from(table)
        .select("id,title,session_type,scheduled_date,start_time,is_completed,status")
        .eq(column, value)
        .limit(5);

      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        title: String(row.title ?? row.session_type ?? "Training Session"),
        subtitle: [row.scheduled_date, row.start_time].filter(Boolean).join(" • ") || "Scheduled work",
        status: row.is_completed === true ? "Complete" : String(row.status ?? "Open"),
      }));
    } catch {
      return [];
    }
  }

  async function loadStats(role: string, userId: string): Promise<DashboardStats> {
    if (role === "trainer") {
      const [athletes, pending, camps, upcoming] = await Promise.all([
        countRows("trainer_relationships", "trainer_id", userId, { column: "status", value: "accepted" }),
        countRows("trainer_relationships", "trainer_id", userId, { column: "status", value: "pending" }),
        countRows("camps", "trainer_id", userId),
        loadUpcomingByColumn("session_instances", "trainer_id", userId),
      ]);
      return { primary: athletes, secondary: pending, tertiary: camps, upcoming };
    }

    if (role === "parent") {
      const [athletes, pending, upcoming] = await Promise.all([
        countRows("parent_athlete_links", "parent_id", userId, { column: "status", value: "accepted" }),
        countRows("parent_athlete_links", "parent_id", userId, { column: "status", value: "pending" }),
        loadUpcomingByColumn("session_instances", "parent_id", userId),
      ]);
      return { primary: athletes, secondary: pending, tertiary: upcoming.length, upcoming };
    }

    if (role === "scout") {
      const [saved, views] = await Promise.all([
        countRows("scout_saved_athletes", "scout_id", userId),
        countRows("public_profile_views", "viewer_id", userId),
      ]);
      return { primary: saved, secondary: views, tertiary: 0, upcoming: [] };
    }

    const [trainers, openSessions, completed, upcoming] = await Promise.all([
      countRows("trainer_relationships", "athlete_id", userId, { column: "status", value: "accepted" }),
      countRows("session_instances", "athlete_id", userId, { column: "is_completed", value: "false" }),
      countRows("activity_logs", "athlete_id", userId),
      loadUpcomingByColumn("session_instances", "athlete_id", userId),
    ]);
    return { primary: trainers, secondary: openSessions, tertiary: completed, upcoming };
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="ascent-bg flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <img src="/ascent-logo.png" alt="Ascent Athletix" className="mx-auto h-16 w-auto opacity-90" />
          <p className="mt-5 font-bold text-white/70">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  const role = normalizeRole(profile?.user_role);
  const isTrainer = role === "trainer";
  const isAthlete = role === "athlete";
  const isParent = role === "parent";
  const dashboardTitle = roleLabels[role] ?? "Dashboard";

  const statLabels = isTrainer
    ? ["Connected Athletes", "Pending Requests", "Active Camps"]
    : isParent
      ? ["Linked Athletes", "Pending Links", "Upcoming"]
      : isAthlete
        ? ["Connected Coaches", "Open Sessions", "Logged Work"]
        : ["Saved Athletes", "Profile Views", "Reports"];

  return (
    <main className="min-h-screen bg-[var(--field-white)] text-[var(--ascent-navy)]">
      <header className="ascent-dashboard-hero px-5 pb-8 pt-8 text-white sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-4">
            <img src="/ascent-logo.png" alt="Ascent Athletix" className="h-12 w-auto" />
            <button onClick={signOut} className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-black text-white/80" type="button">
              Sign Out
            </button>
          </div>

          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.34em] text-[var(--ascent-green)]">{dashboardTitle}</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{displayName(profile)}</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold text-white/65">
                {isTrainer
                  ? "Manage athletes, sessions, accountability, and development from one command center."
                  : isParent
                    ? "Follow athlete development, training activity, and coach connection status."
                    : isAthlete
                      ? "Track the work, complete sessions, and build verified development history."
                      : "Review verified athlete development and profile activity."}
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl font-black text-[var(--ascent-navy)]">
                {initials(profile)}
              </div>
              <div className="pr-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Ascent ID</p>
                <p className="text-lg font-black">{profile?.ascent_id ?? "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="-mt-6 rounded-t-[2.1rem] bg-[var(--field-white)] px-5 py-7 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {dataNotice && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{dataNotice}</div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label={statLabels[0]} value={stats.primary} />
            <StatCard label={statLabels[1]} value={stats.secondary} />
            <StatCard label={statLabels[2]} value={stats.tertiary} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="ascent-card-light rounded-[2rem] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[rgba(7,26,44,0.45)]">Next Up</p>
                  <h2 className="mt-1 text-2xl font-black">Upcoming Sessions</h2>
                </div>
                <span className="rounded-full bg-[rgba(53,216,118,0.16)] px-4 py-2 text-xs font-black text-[var(--ascent-navy)]">
                  {stats.upcoming.length} Open
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {stats.upcoming.length > 0 ? (
                  stats.upcoming.map((item) => <SessionRow key={item.id} item={item} />)
                ) : (
                  <EmptyState title="No upcoming sessions yet" subtitle="Once sessions are assigned or scheduled, they will show here." />
                )}
              </div>
            </section>

            <section className="ascent-card-light rounded-[2rem] p-6">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[rgba(7,26,44,0.45)]">Quick Actions</p>
              <h2 className="mt-1 text-2xl font-black">Move the Work Forward</h2>

              <div className="mt-5 grid gap-3">
                {isTrainer && (
                  <>
                    <ActionCard title="Roster" subtitle="Review connected athletes and requests." />
                    <ActionCard title="Build Plan" subtitle="Create training structure and assignments." />
                    <ActionCard title="Session Requests" subtitle="Approve, decline, or propose new times." />
                  </>
                )}

                {isAthlete && (
                  <>
                    <ActionCard title="Log Work" subtitle="Record training, throwing, hitting, or recovery." />
                    <ActionCard title="Today’s Plan" subtitle="View assigned work and complete sessions." />
                    <ActionCard title="Connect Coach" subtitle="Find and request coach connections." />
                  </>
                )}

                {isParent && (
                  <>
                    <ActionCard title="Linked Athletes" subtitle="View athlete progress and account status." />
                    <ActionCard title="Development Summary" subtitle="Review weekly activity and consistency." />
                    <ActionCard title="Coach Connections" subtitle="Track connection and request activity." />
                  </>
                )}

                {!isTrainer && !isAthlete && !isParent && (
                  <>
                    <ActionCard title="Athlete Search" subtitle="Find verified development profiles." />
                    <ActionCard title="Saved Prospects" subtitle="Return to athletes you are monitoring." />
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="ascent-card-light rounded-[1.7rem] p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[rgba(7,26,44,0.45)]">{label}</p>
      <h2 className="mt-3 text-4xl font-black">{value}</h2>
    </div>
  );
}

function SessionRow({ item }: { item: { title: string; subtitle: string; status?: string } }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-3xl border border-[rgba(7,26,44,0.08)] bg-white p-4">
      <div>
        <p className="font-black">{item.title}</p>
        <p className="mt-1 text-sm font-semibold text-[rgba(7,26,44,0.55)]">{item.subtitle}</p>
      </div>
      <span className="rounded-full bg-[var(--ascent-navy)] px-3 py-2 text-xs font-black text-white">{item.status ?? "Open"}</span>
    </div>
  );
}

function ActionCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <button className="group rounded-3xl border border-[rgba(7,26,44,0.08)] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-xl" type="button">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-black">{title}</p>
          <p className="mt-1 text-sm font-semibold text-[rgba(7,26,44,0.56)]">{subtitle}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(53,216,118,0.18)] font-black text-[var(--ascent-navy)] group-hover:bg-[var(--ascent-green)]">→</span>
      </div>
    </button>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[rgba(7,26,44,0.16)] bg-white/70 p-6 text-center">
      <p className="font-black">{title}</p>
      <p className="mt-2 text-sm font-semibold text-[rgba(7,26,44,0.55)]">{subtitle}</p>
    </div>
  );
}
