"use client"

import Link from "next/link"

const prizes = [
  { place: "1st", label: "Champion", percentage: "40%", color: "from-yellow-400 to-yellow-600", icon: "🏆" },
  { place: "2nd", label: "Runner Up", percentage: "20%", color: "from-gray-300 to-gray-400", icon: "🥈" },
  { place: "3rd", label: "Third Place", percentage: "10%", color: "from-amber-600 to-amber-700", icon: "🥉" },
]

const features = [
  { title: "University Rivalry", desc: "Represent your school and climb the university leaderboard", icon: "🏫" },
  { title: "National Stage", desc: "Compete against players from all universities on the grassroots leaderboard", icon: "🇳🇬" },
  { title: "Real Players, Real Points", desc: "Points are based on actual Nigerian league match performances", icon: "⚽" },
  { title: "Growing Prize Pool", desc: "The more players join, the bigger the prize pool gets", icon: "💰" },
]

export default function RewardsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Home</Link>
          <span className="mx-2 text-gray-600">/</span>
          <span className="text-sm text-brand-400">Rewards</span>
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="font-display text-3xl font-bold mb-2">Prize Pool & Rewards</h1>
          <p className="text-gray-400">Compete, climb the leaderboard, and win big</p>
        </div>

        {/* Prize Pool Card */}
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-8 mb-8 text-center backdrop-blur-xl">
          <p className="text-sm text-brand-400 mb-2">Total Prize Pool</p>
          <p className="font-display text-4xl font-bold text-brand-400 mb-2">40% + 20% + 10% = 70%</p>
          <p className="text-sm text-gray-400">of the total entry fee pool is distributed to top 3 players</p>
        </div>

        {/* Prize Breakdown */}
        <div className="space-y-4 mb-10">
          {prizes.map((prize, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="text-3xl">{prize.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold text-white">{prize.place}</span>
                  <span className="text-sm text-gray-400">— {prize.label}</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">Wins {prize.percentage} of the total pool</p>
              </div>
              <div className={`rounded-xl bg-gradient-to-r ${prize.color} px-4 py-2 text-sm font-bold text-black`}>
                {prize.percentage}
              </div>
            </div>
          ))}
        </div>

        {/* Pool Explanation */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-10 backdrop-blur-xl">
          <h3 className="font-display text-lg font-semibold text-white mb-3">How the Pool Grows</h3>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <span className="h-5 w-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">1</span>
              <p>Each player pays an entry fee to join the season</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="h-5 w-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">2</span>
              <p>All entry fees combine into the <strong className="text-white">total prize pool</strong></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="h-5 w-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">3</span>
              <p>The more players that join, the bigger the pool becomes</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="h-5 w-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">4</span>
              <p>At season end, the top 3 players split 70% of the total pool</p>
            </div>
          </div>
        </div>

        {/* Example */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-10 backdrop-blur-xl">
          <h3 className="font-display text-lg font-semibold text-white mb-3">Example</h3>
          <p className="text-sm text-gray-400 mb-4">If 100 players join at ₦5,000 each:</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/5 p-4 text-center">
              <p className="text-xs text-gray-500">Total Pool</p>
              <p className="text-lg font-bold text-white">₦500,000</p>
            </div>
            <div className="rounded-xl bg-yellow-500/10 p-4 text-center">
              <p className="text-xs text-gray-500">1st Place (40%)</p>
              <p className="text-lg font-bold text-yellow-400">₦200,000</p>
            </div>
            <div className="rounded-xl bg-gray-500/10 p-4 text-center">
              <p className="text-xs text-gray-500">2nd Place (20%)</p>
              <p className="text-lg font-bold text-gray-300">₦100,000</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-amber-500/10 p-4 text-center">
              <p className="text-xs text-gray-500">3rd Place (10%)</p>
              <p className="text-lg font-bold text-amber-600">₦50,000</p>
            </div>
            <div className="rounded-xl bg-white/5 p-4 text-center col-span-2">
              <p className="text-xs text-gray-500">Platform & Operations (30%)</p>
              <p className="text-lg font-bold text-gray-400">₦150,000</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          {features.map((f, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h4 className="font-display text-sm font-semibold text-white mb-1">{f.title}</h4>
              <p className="text-xs text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/oauth/consent"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Join Now & Compete
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
