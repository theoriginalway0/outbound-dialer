import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCampaign, updateCampaign, skipCampaignContact } from '../api'

export default function CampaignView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState(null)

  const load = async () => {
    const data = await getCampaign(id)
    setCampaign(data)
  }

  useEffect(() => { load() }, [id])

  if (!campaign) return <div>Loading...</div>

  const contacts = campaign.campaign_contacts || []
  const total = contacts.length
  const called = contacts.filter(c => c.status === 'called').length
  const skipped = contacts.filter(c => c.status === 'skipped').length
  const pending = contacts.filter(c => c.status === 'pending').length
  const pct = total > 0 ? Math.round((called / total) * 100) : 0

  const handleStartDialing = () => {
    window.dispatchEvent(new CustomEvent('dialer:startCampaign', {
      detail: { campaignId: campaign.id, campaignName: campaign.name }
    }))
  }

  const handleCall = (contact) => {
    window.dispatchEvent(new CustomEvent('dialer:call', {
      detail: {
        contact,
        campaignId: campaign.id,
        campaignName: campaign.name,
        autoCall: true,
      }
    }))
  }

  const handleSkip = async (contactId) => {
    await skipCampaignContact(campaign.id, contactId)
    load()
  }

  const handleStatusChange = async (status) => {
    await updateCampaign(campaign.id, { status })
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{campaign.name}</h1>
          {campaign.description && <p style={{color: '#706e6b', marginTop: 4}}>{campaign.description}</p>}
        </div>
        <div style={{display: 'flex', gap: 8}}>
          {pending > 0 && (
            <button className="btn btn-success" onClick={handleStartDialing}>
              Start Dialing
            </button>
          )}
          {campaign.status !== 'active' && (
            <button className="btn btn-primary" onClick={() => handleStatusChange('active')}>Activate</button>
          )}
          {campaign.status === 'active' && (
            <button className="btn btn-outline" onClick={() => handleStatusChange('paused')}>Pause</button>
          )}
          <button className="btn btn-outline" onClick={() => navigate('/campaigns')}>Back</button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Contacts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{color: 'var(--success)'}}>{called}</div>
          <div className="stat-label">Called</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{color: 'var(--warning)'}}>{skipped}</div>
          <div className="stat-label">Skipped</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pending}</div>
          <div className="stat-label">Pending</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Contact Queue</div>
          <div style={{fontSize: 13, color: '#706e6b'}}>
            Progress: {called}/{total} ({pct}%)
          </div>
        </div>
        <div className="progress-bar" style={{marginBottom: 16}}>
          <div className="progress-fill" style={{width: `${pct}%`}}/>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Status</th>
                <th style={{width: 120}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(cc => (
                <tr key={cc.id}>
                  <td>{cc.order_index + 1}</td>
                  <td><strong>{cc.contact.first_name} {cc.contact.last_name}</strong></td>
                  <td>{cc.contact.phone}</td>
                  <td>{cc.contact.company || '-'}</td>
                  <td><span className={`badge badge-${cc.status}`}>{cc.status}</span></td>
                  <td>
                    {cc.status === 'pending' && (
                      <>
                        <button className="btn-call" onClick={() => handleCall(cc.contact)} title="Call" style={{marginRight: 4}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                          </svg>
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={() => handleSkip(cc.contact_id)}>Skip</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
