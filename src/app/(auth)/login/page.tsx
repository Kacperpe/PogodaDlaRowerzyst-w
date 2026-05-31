import Link from "next/link";
import { LoginForm } from "./login-form";

type Props = {
  searchParams: Promise<{ message?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { message } = await searchParams;

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          Zaloguj się
        </h1>
        <p className="text-sm text-slate-400">
          Mapa pogody dla rowerzystów w trasie
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}

      <LoginForm />

      <p className="text-center text-sm text-slate-400">
        Nie masz konta?{" "}
        <Link
          href="/register"
          className="font-medium text-cyan-400 hover:text-cyan-300"
        >
          Zarejestruj się
        </Link>
      </p>
    </div>
  );
}
