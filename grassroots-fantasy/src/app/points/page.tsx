"use client"

import Link from "next/link"

const scoringRules = [
  { event: "Appearance", points: "2 pts" },
  { event: "Goal (GK)", points: "10 pts" },
  { event: "Goal (DEF)", points: "8 pts" },
  { event: "Goal (MID)", points: "6 pts" },
  { event: "Goal (FWD)", points: "5 pts" },
  { event: "Assist", points: "3 pts" },
  { event: "Clean Sheet (GK)", points: "5 pts" },
  { event: "Clean Sheet (DEF)", points: "4 pts" },
  { event: "Penalty Save (GK)", points: "5 pts" },
  { event: "Goal Conceded (GK)", points: "-2 pts" },
  { event: "Penalty Miss", points: "-2 pts" },
  { event: "Yellow Card", points: "-1 pt" },
  { event: "Red Card", points: "-3 pts" },
  { event: "Own Goal", points: "-2 pts" },
]

const multipliers = [
  { role: "Captain", multiplier: "3x", desc: "All points earned are tripled" },
  { role: "Vice Captain", multiplier: "2x", desc: "All points earned are doubled" },
]

export default function PointsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Home</Link>
          <span className="mx-2 text-gray-600">/</span>
          <span className="text-sm text-brand-400">Points</span>
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="font-display text-3xl font-bold mb-2">How Points Work</h1>
          <p className="text-gray-400">Earn points based on real Nigerian league match performances</p>
        </div>

        {/* Scoring Rules Table */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-8 backdrop-blur-xl">
          <h3 className="font-display text-lg font-semibold text-white mb-4">Scoring Rules</h3>
          <div className="space-y-2">
            {scoringRules.map((rule, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-gray-300">{rule.event}</span>
                <span className={`text-sm font-semibold ${rule.points.startsWith("-") ? "text-red-400" : "text-brand-400"}`}>
                  {rule.points}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Multipliers */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-10 backdrop-blur-xl">
          <h3 className="font-display text-lg font-semibold text-white mb-4">Captain Multipliers</h3>
          <div className="grid grid-cols-2 gap-4">
            {multipliers.map((m, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-sm text-gray-400 mb-1">{m.role}</p>
                <p className="font-display text-2xl font-bold text-brand-400 mb-1">{m.multiplier}</p>
                <p className="text-xs text-gray-500">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/oauth/consent"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Join Now
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
