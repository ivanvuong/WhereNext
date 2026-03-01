import type { TopCard } from '../types/app'
import { formatCurrency } from '../utils/format'

const SummaryCards = ({ topCard }: { topCard: TopCard }) => (
  <div className="summary-cards">
    <div>
      <strong>{topCard.homes}</strong>
      <span>House Number</span>
    </div>
    <div>
      <strong>{formatCurrency(topCard.estimate)}</strong>
      <span>Estimate House Price</span>
    </div>
    <div>
      <strong>{topCard.age}</strong>
      <span>Average Age</span>
    </div>
  </div>
)

export default SummaryCards
