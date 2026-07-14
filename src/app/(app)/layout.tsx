import { requireProfile } from "@/lib/supabase/profile";
import { navItemsForRole } from "@/lib/constants/nav";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const items = navItemsForRole(profile.role);

  return (
    <div className="flex min-h-dvh bg-surface">
      <Sidebar items={items} />
      <div className="flex min-h-dvh flex-1 flex-col">
        <Header profile={profile} />
        <main className="flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-8">
          {children}
        </main>
      </div>
      <BottomNav items={items} />
    </div>
  );
}
