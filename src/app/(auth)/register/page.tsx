import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
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

      <RegisterForm />

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
