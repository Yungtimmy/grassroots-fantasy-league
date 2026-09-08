"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/layout/auth-provider"

interface ProfileData {
  name: string
  email: string
  username: string
  universityName: string
  joinDate: string
  totalPoints: number
  rank: number
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login")
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) {
      fetch("/api/user/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setError(data.error)
          } else {
            setProfile(data)
            setName(data.name ?? "")
            setAvatarUrl(data.avatarUrl ?? "")
          }
        })
        .catch(() => setError("Failed to load profile"))
        .finally(() => setLoading(false))
    }
  }, [user])

  const save = async () => {
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatarUrl }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to save profile")
        return
      }
      setEditing(false)
      if (profile) setProfile({ ...profile, name })
    } catch {
      setError("Failed to save profile. Please try again.")
    }
    setSaving(false)
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl bg-surface-900 border border-surface-800 p-6 mb-6">
        <div className="flex items-center gap-6 mb-6">
          <div className="h-20 w-20 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-2xl font-bold overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              (name || user.name || "?").charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{profile?.name || user.name}</h2>
            <p className="text-surface-400">@{profile?.username || "—"}</p>
            {profile?.universityName && (
              <p className="text-sm text-brand-400 mt-1">{profile.universityName}</p>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-surface-400 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-surface-800 border border-surface-700 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-surface-400 mb-1">Avatar URL</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full rounded-lg bg-surface-800 border border-surface-700 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg bg-surface-800 px-5 py-2 text-sm text-surface-300 hover:bg-surface-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg bg-surface-800 px-5 py-2 text-sm text-surface-300 hover:bg-surface-700 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="rounded-xl bg-surface-900 border border-surface-800 p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Account Information</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-surface-800">
            <span className="text-sm text-surface-400">Email</span>
            <span className="text-sm">{profile?.email || user.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-surface-800">
            <span className="text-sm text-surface-400">Username</span>
            <span className="text-sm">@{profile?.username || "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-surface-800">
            <span className="text-sm text-surface-400">University</span>
            <span className="text-sm text-brand-400">{profile?.universityName || "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-surface-400">Joined</span>
            <span className="text-sm">
              {profile?.joinDate ? new Date(profile.joinDate).toLocaleDateString() : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-surface-900 border border-surface-800 p-6 text-center">
          <p className="text-sm text-surface-400 mb-1">Total Points</p>
          <p className="text-3xl font-bold text-white">{profile?.totalPoints ?? 0}</p>
        </div>
        <div className="rounded-xl bg-surface-900 border border-surface-800 p-6 text-center">
          <p className="text-sm text-surface-400 mb-1">Rank</p>
          <p className="text-3xl font-bold text-white">#{profile?.rank ?? "—"}</p>
        </div>
      </div>
    </div>
  )
}
