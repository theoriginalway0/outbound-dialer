import { useState, useEffect } from "react"
import { getCalls } from "../api"
import { Badge } from "./ui/Badge"
import { RefreshCw } from "lucide-react"

const formatDate = (d) => new Date(d).toLocaleString()
const formatDuration = (s) => {
  if (s == null) return "—"
  return Math.floor(s / 60) + ":" + (s % 60).toString().padStart(2, "0")
}

export default function CallLog() {
  const [calls, setCalls] = useState([])
  const [filter, setFilter] = useState("")

  const load = async () => {
    const params = {}
    if (filter) params.disposition = filter
    setCalls(await getCalls(params))
  }

  useEffect(() => { load() }, [filter])

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select
          className="h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="">All Dispositions</option>
          <option value="answered">Answered</option>
          <option value="voicemail">Voicemail</option>
          <option value="no_answer">No Answer</option>
          <option value="busy">Busy</option>
          <option value="callback">Callback</option>
          <option value="not_interested">Not Interested</option>
        </select>
        <button onClick={load} className="h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date/Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Outcome</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {calls.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">No calls recorded yet</td></tr>
            )}
            {calls.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDate(c.started_at)}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {c.contact ? c.contact.first_name + " " + c.contact.last_name : "—"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{c.contact?.phone || "—"}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-300">{formatDuration(c.duration_seconds)}</td>
                <td className="px-4 py-3">
                  {c.disposition
                    ? <Badge variant={c.disposition}>{c.disposition.replace("_", " ")}</Badge>
                    : <Badge variant={c.status}>{c.status}</Badge>
                  }
                </td>
                <td className="px-4 py-3 text-sm text-slate-400 max-w-[200px] truncate">{c.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
