import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CaptureForm from "@/app/_components/capture-form";
import type { Prompt } from "@/lib/types";

export const metadata: Metadata = {
  title: "Edit prompt",
};

export default async function EditPage(props: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await props.params;

  const { data: prompt } = await supabase
    .from("prompts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!prompt) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Edit prompt</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Update the prompt details. Changes save immediately.
      </p>
      <CaptureForm promptToEdit={prompt as Prompt} />
    </main>
  );
}