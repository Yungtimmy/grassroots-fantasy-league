import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  return (
    <main className="min-h-screen bg-surface-950 text-white pb-20 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">{children}</div>
    </main>
  );
}
