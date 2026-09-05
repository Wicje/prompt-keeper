import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/api-helpers";
import { enrichPromptsWithUrls } from "@/lib/images";

export async function GET() {
  const authed = await getAuthedClient();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user } = authed;

  const { data: prompts, error } = await supabase
    .from("prompts")
    .select("*, generated_images(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Export failed" },
      { status: 500 }
    );
  }

  const withImages = await enrichPromptsWithUrls(supabase, prompts ?? []);

  const exportData = {
    exported_at: new Date().toISOString(),
    count: withImages.length,
    prompts: withImages,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="prompt-keeper-export.json"',
    },
  });
}