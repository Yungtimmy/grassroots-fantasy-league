export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { CinematicFooter } from "@/components/ui/motion-footer";

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
    description: "Every gameweek's club vs club fixtures are published by admins with date and time.",
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
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-black min-h-screen flex items-center">
        {/* Background Image - visible on left side */}
        <div className="absolute inset-0">
          <img 
            src="/bg.jpg" 
            alt="" 
            className="h-full w-full object-cover object-left opacity-40"
          />
          {/* Dark overlay gradient - heavier on right, lighter on left */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/70 to-black/95" />
          {/* Additional darkening from top and bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-400/10 px-4 py-1.5 text-sm font-medium text-brand-400">
              Grassroots Fantasy League
            </div>
            <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl text-white">
              REPRESENT YOUR{" "}
              <span className="bg-gradient-to-r from-brand-400 to-accent-500 bg-clip-text text-transparent">
                UNIVERSITY
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-gray-400 sm:text-xl">
              Build a fantasy football squad, compete against classmates, and climb the national
              Grassroots table — all while repping your school.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/auth/register"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-400 px-7 text-sm font-semibold text-black shadow-lg shadow-brand-400/25 transition-all hover:bg-brand-500"
              >
                Sign Up
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-gray-700 px-7 text-sm font-semibold text-gray-300 transition-all hover:border-gray-500 hover:bg-gray-800"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 sm:py-28 dark:bg-black bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl dark:text-white text-gray-900">
              How it <span className="text-brand-400">works</span>
            </h2>
            <p className="mt-4 dark:text-gray-400 text-gray-600">Four steps. No filler pages until you sign in.</p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900/50 bg-gray-50 p-6"
              >
                <div className="mb-2 text-xs font-bold tracking-widest text-brand-400">
                  STEP {step.number}
                </div>
                <h3 className="font-display text-lg font-semibold dark:text-white text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed dark:text-gray-400 text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CinematicFooter />
    </div>
  );
}
