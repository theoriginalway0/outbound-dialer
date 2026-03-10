import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getContacts, deleteContact } from '../api'

export default function ContactList() {
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const navigate = useNavigate()

  const load = async () => {
    const params = {}
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    const data = await getContacts(params)
    setContacts(data)
  }

  useEffect(() => { load() }, [search, statusFilter])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this contact?')) return
    await deleteContact(id)
    load()
  }

  const handleCall = (contact, e) => {
    e.stopPropagation()
    window.dispatchEvent(new CustomEvent('dialer:call', {
      detail: { contact, autoCall: true }
    }))
  }

  return (
    <div>
      <div className="page-header">
        <h1>Contacts</h1>
        <button className="btn btn-primary" onClick={() => navigate('/contacts/new')}>
          + New Contact
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          className="form-control"
          placeholder="Search contacts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="form-control" style={{maxWidth: 160}} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="unqualified">Unqualified</option>
          <option value="do_not_call">Do Not Call</option>
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Status</th>
                <th style={{width: 100}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 && (
                <tr><td colSpan={5} className="empty-state">No contacts found</td></tr>
              )}
              {contacts.map(c => (
                <tr key={c.id} onClick={() => navigate(`/contacts/${c.id}`)} style={{cursor: 'pointer'}}>
                  <td><strong>{c.first_name} {c.last_name}</strong>{c.title && <div style={{fontSize: 11, color: '#706e6b'}}>{c.title}</div>}</td>
                  <td>{c.phone}</td>
                  <td>{c.company || '-'}</td>
                  <td><span className={`badge badge-${c.status}`}>{c.status.replace('_', ' ')}</span></td>
                  <td>
                    <button className="btn-call" onClick={e => handleCall(c, e)} title="Call">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                      </svg>
                    </button>
                    <button className="btn-icon" onClick={e => handleDelete(c.id, e)} title="Delete">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
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
