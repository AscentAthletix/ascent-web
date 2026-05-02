export type UserRole = "athlete" | "trainer" | "parent" | "scout";

export type Profile = {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  user_role?: UserRole | string | null;
  onboarding_completed?: boolean | null;
  ascent_id?: string | null;
  dob?: string | null;
};

export function dashboardPathForRole(role?: string | null) {
  switch ((role ?? "athlete").toLowerCase()) {
    case "trainer":
    case "coach":
      return "/dashboard?role=trainer";
    case "parent":
      return "/dashboard?role=parent";
    case "scout":
      return "/dashboard?role=scout";
    default:
      return "/dashboard?role=athlete";
  }
}

export function generateAscentId(role: UserRole) {
  const prefix = role === "trainer" ? "T" : role === "parent" ? "P" : role === "scout" ? "S" : "A";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${suffix}`;
}
