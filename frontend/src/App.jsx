import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import ContactList from './components/ContactList'
import ContactForm from './components/ContactForm'
import CallLog from './components/CallLog'
import CampaignList from './components/CampaignList'
import CampaignView from './components/CampaignView'
import Settings from './components/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/contacts" element={<ContactList />} />
        <Route path="/contacts/new" element={<ContactForm />} />
        <Route path="/contacts/:id" element={<ContactForm />} />
        <Route path="/calls" element={<CallLog />} />
        <Route path="/campaigns" element={<CampaignList />} />
        <Route path="/campaigns/:id" element={<CampaignView />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
