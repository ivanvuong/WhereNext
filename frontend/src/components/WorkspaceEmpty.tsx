const WorkspaceEmpty = ({
  hasSearched,
  isLoading,
  onUpdateResults,
}: {
  hasSearched: boolean
  isLoading: boolean
  onUpdateResults: () => void
}) => (
  <div className="workspace-empty">
    <div className="spinner-badge" aria-hidden>
      <div className="spinner" />
    </div>
    <h2>{hasSearched ? 'No communities found' : 'Map will appear here'}</h2>
    <p>
      {hasSearched
        ? 'Adjust commute, radius, or budget and update results again.'
        : 'Click "Update Results" to continue'}
    </p>
    <button className="ghost-cta" type="button" onClick={onUpdateResults} disabled={isLoading}>
      {isLoading ? 'Loading...' : 'View Map Example'}
    </button>
  </div>
)

export default WorkspaceEmpty
