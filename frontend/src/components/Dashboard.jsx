import { useState, useEffect } from "react"
import { getDashboardStats } from "../api"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts"
import { PhoneCall, Users, TrendingUp, Clock, Phone } from "lucide-react"
import { Badge } from "./ui/Badge"

const DISP_COLORS = {
  answered: "#16a34a", voicemail: "#2563eb", no_answer: "#94a3b8",
  busy: "#dc2626", callback: "#f59e0b", not_interested: "#9333ea",
}

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <div className={"p-2 rounded-lg " + color}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value ?? 0}</div>
  </div>
)

const formatDate = (d) => new Date(d).toLocaleString()
const formatDuration = (s) => {
  if (s == null) return "-"
  return Math.floor(s / 60) + ":" + (s % 60).toString().padStart(2, "0")
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => {})
  }, [])

  if (!stats) return (
    <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>
  )

  const dispositionData = Object.entries(stats.disposition_breakdown || {})
    .map(([key, value]) => ({ name: key.replace("_", " "), value, key }))

  const pieData = [
    { name: "Answered", value: stats.disposition_breakdown?.answered || 0, fill: "#16a34a" },
    { name: "Voicemail", value: stats.disposition_breakdown?.voicemail || 0, fill: "#2563eb" },
    { name: "No Answer", value: (stats.disposition_breakdown?.no_answer || 0) + (stats.disposition_breakdown?.busy || 0), fill: "#94a3b8" },
    { name: "Callback", value: stats.disposition_breakdown?.callback || 0, fill: "#f59e0b" },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Calls Today" value={stats.calls_today} icon={PhoneCall} color="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
        <StatCard label="Total Contacts" value={stats.total_contacts} icon={Users} color="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" />
        <StatCard label="Active Campaigns" value={stats.active_campaigns} icon={TrendingUp} color="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" />
        <StatCard label="Avg Duration" value={stats.avg_duration != null ? formatDuration(Math.round(stats.avg_duration)) : "—"} icon={Clock} color="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Dispositions</h3>
          {dispositionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dispositionData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, color: "#f1f5f9", fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {dispositionData.map(e => <Cell key={e.key} fill={DISP_COLORS[e.key] || "#94a3b8"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">No call data yet</div>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Connect Rate</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, color: "#f1f5f9", fontSize: 12 }} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">No call data yet</div>
          )}
        </div>
      </div>

      {/* Recent calls */}
      {stats.recent_calls && stats.recent_calls.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Calls</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {stats.recent_calls.slice(0, 8).map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {c.contact ? c.contact.first_name + " " + c.contact.last_name : c.phone_number || "—"}
                    </div>
                    <div className="text-xs text-slate-400">{formatDate(c.started_at)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{formatDuration(c.duration_seconds)}</span>
                  {c.disposition
                    ? <Badge variant={c.disposition}>{c.disposition.replace("_", " ")}</Badge>
                    : <Badge variant={c.status}>{c.status}</Badge>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
