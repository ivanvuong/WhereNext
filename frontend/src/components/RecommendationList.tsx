import type { RankedCommunity } from '../types/app'
import { estimateCommuteMinutesFromMiles } from '../utils/geo'

const PAGE_SIZE = 3

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
}) => {
  const pages: RankedCommunity[][] = []
  for (let index = 0; index < results.length; index += PAGE_SIZE) {
    pages.push(results.slice(index, index + PAGE_SIZE))
  }

  return (
    <section className="recommendation-list" aria-label="Neighborhood recommendations">
      {pages.map((page, pageIndex) => (
        <div key={`page-${pageIndex}`} className="recommendation-page">
          {page.map((result) => (
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
        </div>
      ))}
    </section>
  )
}

export default RecommendationList
