import { createClient } from "@supabase/supabase-js";

type PageProps = {
  params: Promise<{
    campId: string;
  }>;
};

export default async function CampPage({ params }: PageProps) {
  const resolvedParams = await params;
  const campId = resolvedParams.campId;

  if (!campId) {
    return <div className="p-6">Missing camp ID from URL.</div>;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
        <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-100 p-4 text-sm text-black">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{camp.name ?? "Unnamed Camp"}</h1>
      <pre className="mt-6 whitespace-pre-wrap rounded bg-gray-100 p-4 text-sm text-black">
        {JSON.stringify(camp, null, 2)}
      </pre>
    </div>
  );
}