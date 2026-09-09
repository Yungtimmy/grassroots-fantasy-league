"use client"

import Link from "next/link"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Home</Link>
          <span className="mx-2 text-gray-600">/</span>
          <span className="text-sm text-brand-400">Terms of Service</span>
        </div>

        <h1 className="font-display text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-400 mb-8">Last updated: September 2026</p>

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="font-display text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing and using Grassroots Fantasy League (GFL), you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="font-display text-lg font-semibold text-white mb-3">2. Eligibility</h2>
            <p>GFL is open to verified university students. You must have a valid university email address (Google account) to register. You must be at least 16 years old to participate.</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="font-display text-lg font-semibold text-white mb-3">3. Account Registration</h2>
            <p>You are responsible for maintaining the confidentiality of your account. One account per person. Multiple accounts will result in permanent ban. You must provide accurate registration information.</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="font-display text-lg font-semibold text-white mb-3">4. Entry Fee & Payments</h2>
            <p>A non-refundable entry fee is required to participate in each season. All payments are processed through Flutterwave. GFL reserves the right to modify entry fees for future seasons.</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="font-display text-lg font-semibold text-white mb-3">5. Prizes & Rewards</h2>
            <p>Prize distribution is based on the total pool for the season. 1st place receives 40%, 2nd place receives 20%, and 3rd place receives 10% of the pool. Prizes are distributed via bank transfer within 14 days of season end.</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="font-display text-lg font-semibold text-white mb-3">6. Fair Play</h2>
            <p>Any form of cheating, manipulation, or exploitation of bugs will result in immediate disqualification and account suspension. GFL reserves the right to amend scores and standings in cases of suspected fraud.</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="font-display text-lg font-semibold text-white mb-3">7. Limitation of Liability</h2>
            <p>GFL is not responsible for any damages arising from the use of the platform. The platform is provided &quot;as is&quot; without warranties of any kind.</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="font-display text-lg font-semibold text-white mb-3">8. Changes to Terms</h2>
            <p>GFL reserves the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
