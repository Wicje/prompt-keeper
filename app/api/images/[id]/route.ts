import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/api-helpers";
import { deleteStorageObject } from "@/lib/images";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, ctx: RouteContext) {
  const authed = await getAuthedClient();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user } = authed;
  const { id } = await ctx.params;

  const { data: img } = await supabase
    .from("generated_images")
    .select("id, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!img) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteStorageObject(supabase, img.storage_path);

  const { error } = await supabase
    .from("generated_images")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Delete failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}