import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getContact, getContactCalls, createContact, updateContact } from '../api'

export default function ContactForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    company: '', title: '', status: 'new', notes: '',
  })
  const [calls, setCalls] = useState([])

  useEffect(() => {
    if (isEdit) {
      getContact(id).then(c => setForm({
        first_name: c.first_name, last_name: c.last_name, phone: c.phone,
        email: c.email || '', company: c.company || '', title: c.title || '',
        status: c.status, notes: c.notes || '',
      }))
      getContactCalls(id).then(setCalls).catch(() => {})
    }
  }, [id])

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isEdit) {
      await updateContact(id, form)
    } else {
      await createContact(form)
    }
    navigate('/contacts')
  }

  const formatDate = (d) => new Date(d).toLocaleString()
  const formatDuration = (s) => s != null ? `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}` : '-'

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Contact' : 'New Contact'}</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input className="form-control" name="first_name" value={form.first_name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input className="form-control" name="last_name" value={form.last_name} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input className="form-control" name="phone" value={form.phone} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-control" name="email" type="email" value={form.email} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Company</label>
              <input className="form-control" name="company" value={form.company} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Title</label>
              <input className="form-control" name="title" value={form.title} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="form-control" name="status" value={form.status} onChange={handleChange}>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="unqualified">Unqualified</option>
              <option value="do_not_call">Do Not Call</option>
            </select>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea className="form-control" name="notes" value={form.notes} onChange={handleChange} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">{isEdit ? 'Save Changes' : 'Create Contact'}</button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/contacts')}>Cancel</button>
          </div>
        </form>
      </div>

      {isEdit && calls.length > 0 && (
        <div className="card" style={{marginTop: 16}}>
          <div className="card-header">
            <div className="card-title">Call History</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Duration</th><th>Disposition</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {calls.map(c => (
                  <tr key={c.id}>
                    <td>{formatDate(c.started_at)}</td>
                    <td>{formatDuration(c.duration_seconds)}</td>
                    <td>{c.disposition ? <span className={`badge badge-${c.disposition}`}>{c.disposition.replace('_',' ')}</span> : '-'}</td>
                    <td style={{maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis'}}>{c.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
