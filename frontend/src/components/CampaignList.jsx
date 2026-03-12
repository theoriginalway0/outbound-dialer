import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getCampaigns, createCampaign, deleteCampaign, updateCampaign, getContacts } from "../api"
import CampaignImportModal from "./CampaignImportModal"
import { Badge } from "./ui/Badge"
import { Trash2, Play, Pause, Upload, X } from "lucide-react"

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [contacts, setContacts] = useState([])
  const [selectedContactIds, setSelectedContactIds] = useState([])
  const navigate = useNavigate()

  const load = async () => setCampaigns(await getCampaigns())
  useEffect(() => { load() }, [])

  useEffect(() => {
    const open = () => openCreate()
    window.addEventListener("campaign:openCreate", open)
    return () => window.removeEventListener("campaign:openCreate", open)
  }, [])

  const openCreate = async () => {
    setNewName(""); setNewDesc(""); setSelectedContactIds([])
    setContacts(await getContacts({ limit: 200 }))
    setShowModal(true)
  }

  const handleCreate = async () => {
    if (!newName) return
    await createCampaign({ name: newName, description: newDesc, contact_ids: selectedContactIds })
    setShowModal(false); load()
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm("Delete this campaign?")) return
    await deleteCampaign(id); load()
  }

  const toggleStatus = async (c, e) => {
    e.stopPropagation()
    await updateCampaign(c.id, { status: c.status === "active" ? "paused" : "active" }); load()
  }

  const toggleContact = (id) => {
    setSelectedContactIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const inp = "w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <button onClick={() => setShowImportModal(true)} className="h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors">
          <Upload className="w-3.5 h-3.5" />Import CSV
        </button>
        <button onClick={openCreate} className="h-9 px-3 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-medium transition-colors">
          + New Campaign
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Contacts</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide min-w-[160px]">Progress</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {campaigns.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">No campaigns yet</td></tr>
            )}
            {campaigns.map(c => {
              const pct = c.contact_count > 0 ? Math.round((c.called_count / c.contact_count) * 100) : 0
              return (
                <tr key={c.id} onClick={() => navigate("/campaigns/" + c.id)} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{c.name}</div>
                    {c.description && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{c.description}</div>}
                  </td>
                  <td className="px-4 py-3"><Badge variant={c.status}>{c.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{c.contact_count}</td>
                  <td className="px-4 py-3">
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: pct + "%" }} />
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{c.called_count}/{c.contact_count} ({pct}%)</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={e => toggleStatus(c, e)} className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors" title={c.status === "active" ? "Pause" : "Activate"}>
                        {c.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={e => handleDelete(c.id, e)} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 flex items-center justify-center transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showImportModal && <CampaignImportModal onClose={() => setShowImportModal(false)} onImported={load} />}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">New Campaign</h2>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Campaign Name</label>
                <input className={inp} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Q1 Outreach..." autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                <textarea className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} placeholder="Optional description..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Contacts ({selectedContactIds.length} selected)</label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                  {contacts.length === 0 && <div className="px-3 py-4 text-sm text-center text-slate-400">No contacts available</div>}
                  {contacts.map(c => (
                    <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <input type="checkbox" className="rounded" checked={selectedContactIds.includes(c.id)} onChange={() => toggleContact(c.id)} />
                      <span className="text-sm text-slate-800 dark:text-slate-200">{c.first_name} {c.last_name}</span>
                      <span className="text-xs text-slate-400 ml-auto">{c.phone}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={handleCreate} disabled={!newName} className="flex-1 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">Create Campaign</button>
              <button onClick={() => setShowModal(false)} className="h-9 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
