import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getContacts, deleteContact } from "../api"
import { Badge } from "./ui/Badge"
import { Phone, Trash2, Search, Plus } from "lucide-react"

export default function ContactList() {
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const navigate = useNavigate()

  const load = async () => {
    const params = {}
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    setContacts(await getContacts(params))
  }

  useEffect(() => { load() }, [search, statusFilter])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm("Delete this contact?")) return
    await deleteContact(id); load()
  }

  const handleCall = (contact, e) => {
    e.stopPropagation()
    window.dispatchEvent(new CustomEvent("dialer:call", { detail: { contact, autoCall: true } }))
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="unqualified">Unqualified</option>
          <option value="do_not_call">Do Not Call</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {contacts.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">No contacts found</td></tr>
            )}
            {contacts.map(c => (
              <tr key={c.id} onClick={() => navigate("/contacts/" + c.id)} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{c.first_name} {c.last_name}</div>
                  {c.title && <div className="text-xs text-slate-400 mt-0.5">{c.title}</div>}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{c.phone}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{c.company || "—"}</td>
                <td className="px-4 py-3"><Badge variant={c.status}>{c.status.replace("_", " ")}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={e => handleCall(c, e)} className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 flex items-center justify-center transition-colors" title="Call">
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={e => handleDelete(c.id, e)} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 flex items-center justify-center transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
