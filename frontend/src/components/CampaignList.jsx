import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCampaigns, createCampaign, deleteCampaign, updateCampaign, getContacts } from '../api'

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [contacts, setContacts] = useState([])
  const [selectedContactIds, setSelectedContactIds] = useState([])
  const navigate = useNavigate()

  const load = async () => {
    const data = await getCampaigns()
    setCampaigns(data)
  }

  useEffect(() => { load() }, [])

  const openCreate = async () => {
    setNewName('')
    setNewDesc('')
    setSelectedContactIds([])
    const c = await getContacts({ limit: 200 })
    setContacts(c)
    setShowModal(true)
  }

  const handleCreate = async () => {
    if (!newName) return
    await createCampaign({ name: newName, description: newDesc, contact_ids: selectedContactIds })
    setShowModal(false)
    load()
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this campaign?')) return
    await deleteCampaign(id)
    load()
  }

  const toggleStatus = async (c, e) => {
    e.stopPropagation()
    const newStatus = c.status === 'active' ? 'paused' : 'active'
    await updateCampaign(c.id, { status: newStatus })
    load()
  }

  const toggleContact = (id) => {
    setSelectedContactIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1>Campaigns</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Campaign</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Contacts</th>
                <th>Progress</th>
                <th style={{width: 140}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 && (
                <tr><td colSpan={5} className="empty-state">No campaigns yet</td></tr>
              )}
              {campaigns.map(c => {
                const pct = c.contact_count > 0 ? Math.round((c.called_count / c.contact_count) * 100) : 0
                return (
                  <tr key={c.id} onClick={() => navigate(`/campaigns/${c.id}`)} style={{cursor: 'pointer'}}>
                    <td>
                      <strong>{c.name}</strong>
                      {c.description && <div style={{fontSize: 11, color: '#706e6b'}}>{c.description}</div>}
                    </td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                    <td>{c.contact_count}</td>
                    <td style={{minWidth: 120}}>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width: `${pct}%`}}/>
                      </div>
                      <div style={{fontSize: 11, color: '#706e6b', marginTop: 2}}>{c.called_count}/{c.contact_count} ({pct}%)</div>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={e => toggleStatus(c, e)}>
                        {c.status === 'active' ? 'Pause' : 'Activate'}
                      </button>
                      <button className="btn-icon" onClick={e => handleDelete(c.id, e)} title="Delete" style={{marginLeft: 4}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>New Campaign</h2>
            <div className="form-group">
              <label>Campaign Name</label>
              <input className="form-control" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="form-control" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} />
            </div>
            <div className="form-group">
              <label>Select Contacts ({selectedContactIds.length} selected)</label>
              <div style={{maxHeight: 200, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 4}}>
                {contacts.map(c => (
                  <label key={c.id} style={{display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 13}}>
                    <input type="checkbox" checked={selectedContactIds.includes(c.id)} onChange={() => toggleContact(c.id)} />
                    {c.first_name} {c.last_name} - {c.phone}
                    {c.company && <span style={{color: '#706e6b', marginLeft: 4}}>({c.company})</span>}
                  </label>
                ))}
                {contacts.length === 0 && <div style={{padding: 12, textAlign: 'center', color: '#706e6b'}}>No contacts available</div>}
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleCreate} disabled={!newName}>Create Campaign</button>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
