import { createClient } from "@/lib/supabase/client";

export default async function CampPage({
  params,
}: {
  params: { campId: string };
}) {
  const supabase = createClient();

  const { data: camp, error } = await supabase
    .from("camps")
    .select("*")
    .eq("id", params.campId)
    .single();

  if (error) {
    return <div>Error loading camp</div>;
  }

  if (!camp) {
    return <div>Camp not found</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{camp.name}</h1>
      <p>{camp.description}</p>
    </div>
  );
}