async function resolveGetRecordsPage(getRecordsPageImpl) {
  if (getRecordsPageImpl) {
    return getRecordsPageImpl;
  }

  const mod = await import('./chain.js');
  return mod.getRecordsPage;
}

export async function loadProfilePage({
  address,
  limit,
  cursor = null,
  getRecordsPageImpl,
} = {}) {
  const getRecordsPage = await resolveGetRecordsPage(getRecordsPageImpl);
  const page = await getRecordsPage({ author: address, limit, cursor });

  return {
    address,
    onchainApproved: true,
    records: page.records,
    pageInfo: {
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    },
  };
}
