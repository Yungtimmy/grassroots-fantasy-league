import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-950 px-4">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-3xl font-bold text-transparent">
            GFL
          </span>
        </Link>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
