import type { RankedCommunity } from '../types/app'

const RecommendationList = ({
  results,
  selectedId,
  onSelect,
  buildReason,
  buildTradeoff,
}: {
  results: RankedCommunity[]
  selectedId: string | null
  onSelect: (id: string) => void
  buildReason: (item: RankedCommunity) => string
  buildTradeoff: (item: RankedCommunity) => string
}) => (
  <section className="recommendation-list">
    {results.slice(0, 4).map((result) => (
      <button
        key={result.id}
        type="button"
        className={`recommendation-item ${selectedId === result.id ? 'recommendation-item--active' : ''}`}
        onClick={() => onSelect(result.id)}
      >
        <div>
          <h4>{result.name}</h4>
          <p>{buildReason(result)}</p>
          <p className="recommendation-tradeoff">{buildTradeoff(result)}</p>
        </div>
        <strong>{Math.round(result.overallScore)}</strong>
      </button>
    ))}
  </section>
)

export default RecommendationList
