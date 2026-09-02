import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CaptureForm from "@/app/_components/capture-form";
import CaptureHelper from "@/app/_components/capture-helper";

export const metadata: Metadata = {
  title: "Capture prompt",
};

export default async function AddPage(props: PageProps<"/add">) {
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

  const searchParams = await props.searchParams;
  const prompt =
    typeof searchParams?.prompt === "string" ? searchParams.prompt : "";
  const source =
    typeof searchParams?.source === "string" ? searchParams.source : "";
  const ai = typeof searchParams?.ai === "string" ? searchParams.ai : "";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Capture a prompt</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Paste the prompt the AI gave you, add the reference and your generated
        image, and save.
      </p>
      <CaptureForm
        prefillPrompt={prompt}
        prefillSource={source}
        prefillAiSource={ai}
      />

      <div className="mt-12">
        <CaptureHelper />
      </div>
    </main>
  );
}
