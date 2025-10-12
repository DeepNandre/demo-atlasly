// Client ID management for guest users

const CLIENT_ID_KEY = 'studio_site_client_id';

export function getClientId(): string {
  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  
  if (!clientId) {
    // Generate UUIDv4
    clientId = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  
  return clientId;
}

export function clearClientId(): void {
  localStorage.removeItem(CLIENT_ID_KEY);
}
