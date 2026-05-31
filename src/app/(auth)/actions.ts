"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return "Nieprawidłowy email lub hasło.";
  }

  redirect("/");
}

export async function register(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return "Rejestracja nie powiodła się. Sprawdź dane i spróbuj ponownie.";
  }

  redirect("/login?message=" + encodeURIComponent("Sprawdź email, aby potwierdzić konto."));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
