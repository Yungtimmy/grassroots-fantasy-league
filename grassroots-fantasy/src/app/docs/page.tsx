"use client"

import Link from "next/link"

const sections = [
  {
    title: "What is GFL?",
    content: "Grassroots Fantasy League (GFL) is a university-based fantasy football platform where students represent their schools, build dream teams from real Nigerian league players, and compete for cash prizes based on actual match performances."
  },
  {
    title: "How Points Work",
    content: "Players earn fantasy points based on real-world match statistics. Points are awarded for appearances, goals, assists, clean sheets, and more. Different positions earn different amounts — defenders earn more for clean sheets, forwards earn more for goals.",
    items: [
      "Appearance: +2 pts for any minutes played",
      "Goal (GK: 10, DEF: 8, MID: 6, FWD: 5)",
      "Assist: +3 pts",
      "Clean Sheet (GK: 5, DEF: 4)",
      "Penalty Save (GK): +5 pts",
      "Goal Conceded (GK): -2 pts",
      "Penalty Miss: -2 pts",
      "Only the starting XI scores. Substitutes never count",
      "Yellow Card: -1 pt",
      "Red Card: -3 pts",
      "Own Goal: -2 pts",
      "Captain: 3x multiplier",
      "Vice Captain: 2x multiplier"
    ]
  },
  {
    title: "Squad Rules",
    content: "Build a squad of 16 players within a 1,000m budget. Select 11 starters and 5 substitutes. Choose a captain (3x points) and vice-captain (2x points). You can make unlimited transfers before the gameweek deadline."
  },
  {
    title: "Gameweeks",
    content: "Each round of real-world matches is a gameweek. Your team's points are calculated based on how your selected players performed in real matches. Check the fixtures page to see upcoming matches and deadlines."
  },
  {
    title: "Leaderboards",
    content: "Compete on multiple leaderboards — your university leaderboard and the national grassroots leaderboard. Climb the ranks by earning the most fantasy points each gameweek."
  },
  {
    title: "Payment & Entry",
    content: "A one-time entry fee is required to participate. Payments are processed securely through Flutterwave. Once registered, you gain full access to build your squad and compete."
  }
]

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Home</Link>
          <span className="mx-2 text-gray-600">/</span>
          <span className="text-sm text-brand-400">Documentation</span>
        </div>

        <h1 className="font-display text-3xl font-bold mb-2">Documentation</h1>
        <p className="text-gray-400 mb-8">Everything you need to know about Grassroots Fantasy League</p>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h2 className="font-display text-xl font-semibold text-white mb-3">{section.title}</h2>
              <p className="text-gray-300 text-sm leading-relaxed">{section.content}</p>
              {section.items && (
                <ul className="mt-3 space-y-1">
                  {section.items.map((item, j) => (
                    <li key={j} className="text-sm text-gray-400 flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-brand-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Still have questions?{" "}
            <a href="https://chat.whatsapp.com/GSKeSlgJmDoKAhnM0yfxZY?mode=gi_t" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300">
              Join our WhatsApp community
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
