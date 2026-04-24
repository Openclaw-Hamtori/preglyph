export function buildProfileRequestPath(address, { cursor = '', limit = 0 } = {}) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (limit) params.set('limit', String(limit));
  return `/api/profile/${address}${params.size ? `?${params.toString()}` : ''}`;
}

function getProfileRecordKey(record) {
  if (record?.txHash && record?.id !== undefined) {
    return `${record.txHash}:${record.id}`;
  }
  if (record?.txHash) {
    return record.txHash;
  }
  if (record?.id !== undefined) {
    return String(record.id);
  }
  return JSON.stringify(record);
}

export function mergeProfilePage(currentProfile, incomingProfile, { append = false } = {}) {
  if (!append || !currentProfile) {
    return incomingProfile;
  }

  const mergedRecords = [...(currentProfile.records || []), ...(incomingProfile.records || [])];
  const uniqueRecords = [];
  const seen = new Set();
  for (const record of mergedRecords) {
    const key = getProfileRecordKey(record);
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueRecords.push(record);
  }

  return {
    ...incomingProfile,
    records: uniqueRecords,
  };
}
