export function shouldShowArchiveLoading({
  recordsLoading = false,
  displayedRecordCount = 0,
  searchQuery = '',
} = {}) {
  return Boolean(recordsLoading) && displayedRecordCount === 0 && !String(searchQuery).trim();
}
