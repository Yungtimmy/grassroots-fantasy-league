"use client"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/components/layout/auth-provider"

interface ProfileData {
  name: string
  email: string
  username: string
  phone: string | null
  avatar: string | null
  role: string
  faculty: string | null
  department: string | null
  facultyId: string | null
  departmentId: string | null
  universityName: string | null
  universityShort: string | null
  universitySlug: string | null
  totalPoints: number
  formation: string | null
  rank: number
  joinDate: string
}

interface Faculty { id: string; name: string }
interface Department { id: string; name: string }

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [phone, setPhone] = useState("")
  const [avatar, setAvatar] = useState("")
  const [facultyId, setFacultyId] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setProfile(data)
          setName(data.name ?? "")
          setUsername(data.username ?? "")
          setPhone(data.phone ?? "")
          setAvatar(data.avatar ?? "")
          setFacultyId(data.facultyId ?? "")
          setDepartmentId(data.departmentId ?? "")

          if (data.universitySlug) {
            fetch(`/api/universities/${data.universitySlug}/faculties`)
              .then((r) => r.json())
              .then((d) => { if (d.success) setFaculties(d.data.faculties) })
              .catch(() => {})
          }
        }
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!facultyId) { setDepartments([]); return }
    fetch(`/api/faculties/${facultyId}/departments`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setDepartments(d.data.departments) })
      .catch(() => {})
  }, [facultyId])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    setUploading(true)
    setError("")

    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string
        setAvatar(base64)
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setError("Failed to upload image")
      setUploading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, phone, avatar, facultyId: facultyId || null, departmentId: departmentId || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to save profile")
        return
      }
      setEditing(false)
      if (profile) setProfile({ ...profile, ...data })
    } catch {
      setError("Failed to save profile. Please try again.")
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 px-4 py-8">
        <div className="h-8 w-24 rounded bg-white/10 animate-pulse" />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-white/10 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-32 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-40 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
          <div className="space-y-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="space-y-1">
                <div className="h-2 w-16 rounded bg-white/5 animate-pulse" />
                <div className="h-10 w-full rounded-xl bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Profile</h1>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Profile Card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="flex items-center gap-6 mb-6">
          <div className="relative group">
            <div className="h-20 w-20 rounded-2xl bg-brand-500/20 flex items-center justify-center text-brand-400 text-2xl font-bold overflow-hidden">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                (name || user?.name || "?").charAt(0).toUpperCase()
              )}
            </div>
            {editing && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {uploading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white">{profile?.name || user?.name}</h2>
            <p className="text-gray-400">@{profile?.username || "—"}</p>
            {profile?.universityName && (
              <p className="text-sm text-brand-400 mt-1">{profile.universityName}</p>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 801 234 5678"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
            {faculties.length > 0 && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Faculty</label>
                <select
                  value={facultyId}
                  onChange={(e) => { setFacultyId(e.target.value); setDepartmentId("") }}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                >
                  <option value="">Select Faculty</option>
                  {faculties.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}
            {departments.length > 0 && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setName(profile?.name || "")
                  setUsername(profile?.username || "")
                  setPhone(profile?.phone || "")
                  setAvatar(profile?.avatar || "")
                  setFacultyId(profile?.facultyId || "")
                  setDepartmentId(profile?.departmentId || "")
                }}
                className="rounded-xl bg-white/5 border border-white/10 px-5 py-2.5 text-sm text-gray-300 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="rounded-xl bg-white/5 border border-white/10 px-5 py-2.5 text-sm text-gray-300 hover:bg-white/10 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Account Information */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
        <div className="space-y-3">
          {[
            { label: "Email", value: profile?.email || user?.email || "—" },
            { label: "Username", value: `@${profile?.username || "—"}` },
            { label: "Phone", value: profile?.phone || "Not set" },
            { label: "University", value: profile?.universityName || "—" },
            { label: "Faculty", value: profile?.faculty || "Not set" },
            { label: "Department", value: profile?.department || "Not set" },
            { label: "Role", value: profile?.role || "—" },
            { label: "Joined", value: profile?.joinDate ? new Date(profile.joinDate).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" }) : "—" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-sm text-gray-400">{item.label}</span>
              <span className="text-sm text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
          <p className="text-sm text-gray-400 mb-1">Total Points</p>
          <p className="text-3xl font-bold text-brand-400">{profile?.totalPoints ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
          <p className="text-sm text-gray-400 mb-1">Rank</p>
          <p className="text-3xl font-bold text-white">#{profile?.rank || "—"}</p>
        </div>
      </div>
    </div>
  )
}
