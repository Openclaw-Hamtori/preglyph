export async function ensureWritableProfile({ address, fetchImpl = fetch } = {}) {
  if (!address) {
    throw new Error('Connect a wallet first.');
  }

  const profileResponse = await fetchImpl(`/api/profile/${address}`, { cache: 'no-store' });
  const profilePayload = await profileResponse.json();
  if (!profileResponse.ok) {
    throw new Error(profilePayload.error || 'Failed to load writer status.');
  }

  const profile = profilePayload.profile || { address, records: [] };
  if (profile.onchainApproved) {
    return profile;
  }

  const approveResponse = await fetchImpl('/api/writers/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  const approvePayload = await approveResponse.json();
  if (!approveResponse.ok) {
    throw new Error(approvePayload.error || 'Failed to enable writing.');
  }

  return {
    ...profile,
    address,
    onchainApproved: true,
  };
}
