import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { getCampaign, updateCampaign, skipCampaignContact } from "../api"
import { Badge } from "./ui/Badge"
import { Phone, SkipForward, Play, Pause, ArrowLeft } from "lucide-react"

export default function CampaignView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState(null)

  const load = async () => setCampaign(await getCampaign(id))
  useEffect(() => { load() }, [id])

  if (!campaign) return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>

  const contacts = campaign.campaign_contacts || []
  const total = contacts.length
  const called = contacts.filter(c => c.status === "called").length
  const skipped = contacts.filter(c => c.status === "skipped").length
  const pending = contacts.filter(c => c.status === "pending").length
  const pct = total > 0 ? Math.round((called / total) * 100) : 0

  const handleStartDialing = () => {
    window.dispatchEvent(new CustomEvent("dialer:startCampaign", { detail: { campaignId: campaign.id, campaignName: campaign.name } }))
  }

  const handleCall = (contact) => {
    window.dispatchEvent(new CustomEvent("dialer:call", { detail: { contact, campaignId: campaign.id, campaignName: campaign.name, autoCall: true } }))
  }

  const handleSkip = async (contactId) => {
    await skipCampaignContact(campaign.id, contactId); load()
  }

  const handleStatusChange = async (status) => {
    await updateCampaign(campaign.id, { status }); load()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate("/campaigns")} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{campaign.name}</h1>
            <Badge variant={campaign.status}>{campaign.status}</Badge>
          </div>
          {campaign.description && <p className="text-sm text-slate-500 dark:text-slate-400 ml-6">{campaign.description}</p>}
        </div>
        <div className="flex gap-2">
          {pending > 0 && (
            <button onClick={handleStartDialing} className="h-9 px-4 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium flex items-center gap-2 transition-colors">
              <Play className="w-3.5 h-3.5" />Start Dialing
            </button>
          )}
          {campaign.status !== "active" && (
            <button onClick={() => handleStatusChange("active")} className="h-9 px-3 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">Activate</button>
          )}
          {campaign.status === "active" && (
            <button onClick={() => handleStatusChange("paused")} className="h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
              <Pause className="w-3.5 h-3.5" />Pause
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[["Total", total, "text-slate-900 dark:text-slate-100"], ["Called", called, "text-green-600 dark:text-green-400"], ["Skipped", skipped, "text-amber-600 dark:text-amber-400"], ["Pending", pending, "text-blue-600 dark:text-blue-400"]].map(([label, val, color]) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
            <div className={"text-2xl font-bold " + color}>{val}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Contact table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Contact Queue</h3>
            <span className="text-xs text-slate-400">{called}/{total} ({pct}%)</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: pct + "%" }} />
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-10">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {contacts.map(cc => (
              <tr key={cc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-400">{cc.order_index + 1}</td>
                <td className="px-4 py-3 font-medium text-sm text-slate-900 dark:text-slate-100">{cc.contact.first_name} {cc.contact.last_name}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{cc.contact.phone}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{cc.contact.company || "—"}</td>
                <td className="px-4 py-3"><Badge variant={cc.status}>{cc.status}</Badge></td>
                <td className="px-4 py-3">
                  {cc.status === "pending" && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleCall(cc.contact)} className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 flex items-center justify-center transition-colors" title="Call">
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleSkip(cc.contact_id)} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors" title="Skip">
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
