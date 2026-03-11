const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

// Contacts
export const getContacts = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/contacts${qs ? '?' + qs : ''}`);
};
export const getContact = (id) => request(`/contacts/${id}`);
export const getContactCalls = (id) => request(`/contacts/${id}/calls`);
export const createContact = (data) => request('/contacts', { method: 'POST', body: JSON.stringify(data) });
export const updateContact = (id, data) => request(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteContact = (id) => request(`/contacts/${id}`, { method: 'DELETE' });

// Calls
export const initiateCall = (data) => request('/calls/initiate', { method: 'POST', body: JSON.stringify(data) });
export const endCall = (id, data) => request(`/calls/${id}/end`, { method: 'POST', body: JSON.stringify(data) });
export const hangupCall = (id) => request(`/calls/${id}/hangup`, { method: 'POST' });
export const getCalls = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/calls${qs ? '?' + qs : ''}`);
};
export const getActiveCall = () => request('/calls/active');

// Campaigns
export const getCampaigns = () => request('/campaigns');
export const getCampaign = (id) => request(`/campaigns/${id}`);
export const createCampaign = (data) => request('/campaigns', { method: 'POST', body: JSON.stringify(data) });
export const updateCampaign = (id, data) => request(`/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteCampaign = (id) => request(`/campaigns/${id}`, { method: 'DELETE' });
export const getNextCampaignContact = (id) => request(`/campaigns/${id}/next`);
export const skipCampaignContact = (campaignId, contactId) =>
  request(`/campaigns/${campaignId}/skip/${contactId}`, { method: 'POST' });
export const addContactsToCampaign = (campaignId, contactIds) =>
  request(`/campaigns/${campaignId}/contacts`, { method: 'POST', body: JSON.stringify(contactIds) });

export const importCampaign = (formData) =>
  fetch(`${BASE}/campaigns/import`, { method: 'POST', body: formData })
    .then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Import failed');
      }
      return res.json();
    });

// Dashboard
export const getDashboardStats = () => request('/dashboard/stats');
export const getRecentCalls = () => request('/dashboard/recent-calls');
