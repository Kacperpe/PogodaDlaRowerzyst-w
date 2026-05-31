"use client";

import { useActionState } from "react";
import { register } from "../actions";

export function RegisterForm() {
  const [error, action, isPending] = useActionState(register, null);

  return (
    <form action={action} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">
          Email
        </label>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-400/40 placeholder:text-slate-500 focus:ring"
          placeholder="ty@przykład.pl"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">
          Hasło
        </label>
        <input
          type="password"
          name="password"
          required
          autoComplete="new-password"
          minLength={6}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-400/40 placeholder:text-slate-500 focus:ring"
          placeholder="min. 6 znaków"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
      >
        {isPending ? "Rejestrowanie..." : "Zarejestruj się"}
      </button>
    </form>
  );
}
