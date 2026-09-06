"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  if (!supabase) {
    redirect(
      "/login?error=" +
        encodeURIComponent("Supabase is not configured. Set your env vars.")
    );
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("Email and password are required"));
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  redirect("/login?message=" + encodeURIComponent("Check your email to confirm your account."));
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase is not configured. Set your env vars." };
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
