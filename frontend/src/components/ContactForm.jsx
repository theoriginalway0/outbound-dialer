import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { getContact, getContactCalls, createContact, updateContact } from "../api"
import { Badge } from "./ui/Badge"
import { ArrowLeft } from "lucide-react"

const inp = "w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const label = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"

const formatDate = (d) => new Date(d).toLocaleString()
const formatDuration = (s) => s != null ? Math.floor(s/60) + ":" + (s%60).toString().padStart(2,"0") : "—"

export default function ContactForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", email: "", company: "", title: "", status: "new", notes: "" })
  const [calls, setCalls] = useState([])

  useEffect(() => {
    if (isEdit) {
      getContact(id).then(c => setForm({ first_name: c.first_name, last_name: c.last_name, phone: c.phone, email: c.email || "", company: c.company || "", title: c.title || "", status: c.status, notes: c.notes || "" }))
      getContactCalls(id).then(setCalls).catch(() => {})
    }
  }, [id])

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isEdit) await updateContact(id, form); else await createContact(form)
    navigate("/contacts")
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <button onClick={() => navigate("/contacts")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
        <ArrowLeft className="w-4 h-4" />Back to Contacts
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-5">{isEdit ? "Edit Contact" : "New Contact"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>First Name</label>
              <input className={inp} name="first_name" value={form.first_name} onChange={handleChange} required />
            </div>
            <div>
              <label className={label}>Last Name</label>
              <input className={inp} name="last_name" value={form.last_name} onChange={handleChange} required />
            </div>
            <div>
              <label className={label}>Phone</label>
              <input className={inp} name="phone" value={form.phone} onChange={handleChange} required />
            </div>
            <div>
              <label className={label}>Email</label>
              <input className={inp} name="email" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div>
              <label className={label}>Company</label>
              <input className={inp} name="company" value={form.company} onChange={handleChange} />
            </div>
            <div>
              <label className={label}>Title</label>
              <input className={inp} name="title" value={form.title} onChange={handleChange} />
            </div>
          </div>
          <div>
            <label className={label}>Status</label>
            <select className={inp} name="status" value={form.status} onChange={handleChange}>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="unqualified">Unqualified</option>
              <option value="do_not_call">Do Not Call</option>
            </select>
          </div>
          <div>
            <label className={label}>Notes</label>
            <textarea className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" name="notes" value={form.notes} onChange={handleChange} rows={3} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="h-9 px-4 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">{isEdit ? "Save Changes" : "Create Contact"}</button>
            <button type="button" onClick={() => navigate("/contacts")} className="h-9 px-4 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          </div>
        </form>
      </div>

      {isEdit && calls.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Call History</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Outcome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {calls.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(c.started_at)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-300">{formatDuration(c.duration_seconds)}</td>
                  <td className="px-4 py-3">{c.disposition ? <Badge variant={c.disposition}>{c.disposition.replace("_"," ")}</Badge> : "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-400 max-w-[200px] truncate">{c.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
