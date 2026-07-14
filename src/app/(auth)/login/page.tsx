import Image from "next/image";
import { signIn } from "./actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image
            src="/logo-cpo-greece.webp"
            alt="CPO Greece"
            width={175}
            height={100}
            className="h-14 w-auto"
            priority
          />
          <h1 className="text-lg font-semibold text-primary-dark">
            Synchroline CRM
          </h1>
        </div>

        <form
          action={signIn}
          className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="next" value={next ?? "/dashboard"} />

          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="onoma@synchroline.gr"
            />
          </div>

          <div className="mb-5">
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Κωδικός
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full">
            Σύνδεση
          </Button>
        </form>
      </div>
    </div>
  );
}
