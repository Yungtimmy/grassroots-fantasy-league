export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-black text-white pb-20 md:pb-0 pt-20 md:pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">{children}</div>
    </main>
  );
}
