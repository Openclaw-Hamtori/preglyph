export async function ensureWritableProfile({ address, fetchImpl = fetch } = {}) {
  if (!address) {
    throw new Error('Connect a wallet first.');
  }

  const profileResponse = await fetchImpl(`/api/profile/${address}`, { cache: 'no-store' });
  const profilePayload = await profileResponse.json();
  if (!profileResponse.ok) {
    throw new Error(profilePayload.error || 'Failed to load writer status.');
  }

  return {
    ...(profilePayload.profile || { records: [] }),
    address,
    onchainApproved: true,
  };
}
