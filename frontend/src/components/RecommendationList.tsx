import type { RankedCommunity } from '../types/app'
import { estimateCommuteMinutesFromMiles } from '../utils/geo'

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
    {results.map((result) => (
      <button
        key={result.id}
        type="button"
        className={`recommendation-item ${selectedId === result.id ? 'recommendation-item--active' : ''}`}
        onClick={() => onSelect(result.id)}
      >
        <div>
          <h4>{result.name}</h4>
          <p className="recommendation-commute">~{estimateCommuteMinutesFromMiles(result.distanceMiles)} min from anchor</p>
          <p>{buildReason(result)}</p>
          <p className="recommendation-tradeoff">{buildTradeoff(result)}</p>
        </div>
        <strong>{Math.round(result.overallScore)}</strong>
      </button>
    ))}
  </section>
)

export default RecommendationList
