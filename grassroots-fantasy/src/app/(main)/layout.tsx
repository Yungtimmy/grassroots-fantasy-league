export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-black text-white pb-20 md:pb-0 pt-14 md:pt-[6.75rem]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">{children}</div>
    </main>
  );
}
