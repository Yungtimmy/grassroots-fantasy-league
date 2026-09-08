import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";

const steps = [
  {
    number: "01",
    title: "Register",
    description: "Create an account and pick your university from the list set by GFL admins.",
  },
  {
    number: "02",
    title: "Pick your squad",
    description: "Choose a starting 11 and 5 substitutes from real clubs, within budget.",
  },
  {
    number: "03",
    title: "Follow fixtures",
    description: "Every gameweek’s club vs club fixtures are published by admins with date and time.",
  },
  {
    number: "04",
    title: "Compete",
    description: "Earn points from real performances and climb your university and national tables.",
  },
];

export default async function HomePage() {
  const user = await getAuthUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-pitch-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-4 py-1.5 text-sm font-medium text-brand-400">
              Grassroots Fantasy League
            </div>
            <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              REPRESENT YOUR{" "}
              <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
                UNIVERSITY
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-surface-400 sm:text-xl">
              Build a fantasy football squad, compete against classmates, and climb the national
              Grassroots table — all while repping your school.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/auth/register"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-7 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600"
              >
                Join your university
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-surface-600 px-7 text-sm font-semibold text-surface-300 transition-all hover:border-surface-500 hover:bg-surface-800"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              How it <span className="text-brand-400">works</span>
            </h2>
            <p className="mt-4 text-surface-400">Four steps. No filler pages until you sign in.</p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-surface-700/50 bg-surface-800/50 p-6"
              >
                <div className="mb-2 text-xs font-bold tracking-widest text-brand-500/60">
                  STEP {step.number}
                </div>
                <h3 className="font-display text-lg font-semibold text-surface-100">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-surface-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
