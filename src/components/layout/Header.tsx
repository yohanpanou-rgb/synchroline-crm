import { signOut } from "@/app/(app)/actions";
import { Badge } from "@/components/ui/Badge";
import { LogoutIcon } from "@/components/ui/icons";
import type { Database } from "@/lib/types/database.types";

const ROLE_LABEL: Record<Database["public"]["Tables"]["profiles"]["Row"]["role"], string> = {
  rep: "Rep",
  manager: "Manager",
  admin: "Admin",
};

export function Header({
  profile,
}: {
  profile: Database["public"]["Tables"]["profiles"]["Row"];
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-black/5 bg-white/90 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <span className="text-sm font-semibold text-primary-dark">
          Synchroline
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight text-ink">
            {profile.full_name}
          </p>
        </div>
        <Badge tone="neutral">{ROLE_LABEL[profile.role]}</Badge>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Αποσύνδεση"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ink/50 hover:bg-black/5 hover:text-danger"
          >
            <LogoutIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </header>
  );
}
