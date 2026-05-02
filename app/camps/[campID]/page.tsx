import { createClient } from "@supabase/supabase-js";

export default async function CampPage({
  params,
}: {
  params: Promise<{ campId: string }>;
}) {
  const { campId } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Missing Supabase env variables</h1>
      </div>
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: camp, error } = await supabase
    .from("camps")
    .select("*")
    .eq("id", campId)
    .single();

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Error loading camp</h1>
        <p className="mt-2">Camp ID: {campId}</p>
        <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-100 p-4 text-sm">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  if (!camp) {
    return <div className="p-6">Camp not found</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{camp.name ?? "Unnamed Camp"}</h1>
      <p className="mt-2">{camp.description ?? "No description available."}</p>

      <pre className="mt-6 whitespace-pre-wrap rounded bg-gray-100 p-4 text-sm">
        {JSON.stringify(camp, null, 2)}
      </pre>
    </div>
  );
}