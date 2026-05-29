import Link from "next/link";
import { register } from "../actions";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          Utwórz konto
        </h1>
        <p className="text-sm text-slate-400">
          Mapa pogody dla rowerzystów w trasie
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <form action={register} className="space-y-4">
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
          className="w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          Zarejestruj się
        </button>
      </form>

      <p className="text-center text-sm text-slate-400">
        Masz już konto?{" "}
        <Link
          href="/login"
          className="font-medium text-cyan-400 hover:text-cyan-300"
        >
          Zaloguj się
        </Link>
      </p>
    </div>
  );
}
