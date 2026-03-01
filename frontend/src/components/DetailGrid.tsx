import type { RankedCommunity, ResolvedAnchor } from '../types/app'

const DetailGrid = ({
  selected,
  anchorLabel,
  anchor,
}: {
  selected: RankedCommunity
  anchorLabel: string | null
  anchor: ResolvedAnchor
}) => (
  <section className="detail-grid">
    <article className="location-card">
      <header>
        <div>
          <h3>Location</h3>
          <p>
            {selected.name}, near {anchorLabel ?? anchor.label}
          </p>
          <p className="code-line">HO-1, HO-3, HO-7</p>
          <div className="score-strip">
            <span>Match {Math.round(selected.overallScore)}</span>
            <span>Commute {Math.round(selected.commuteScore)}</span>
            <span>Cost {Math.round(selected.affordabilityScore)}</span>
            <span>Lifestyle {Math.round(selected.lifestyleScore)}</span>
          </div>
        </div>
        <div className="heart">❤</div>
      </header>

      <div className="stat-row">
        <div className="stat-box">
          <span>Building Age</span>
          <strong>{Math.max(4, Math.round(29 - selected.distanceMiles))}Y</strong>
        </div>
        <div className="stat-box">
          <span>Daily Visitors</span>
          <strong>{(9800 + Math.round(selected.overallScore * 8)).toLocaleString()}</strong>
        </div>
        <div className="stat-box">
          <span>Temperature</span>
          <strong>{selected.region === 'sf' ? '61°F' : '79°F'}</strong>
        </div>
      </div>
    </article>

    <article className="property-card" aria-label="Property preview">
      <div className="property-card__image" />
    </article>

    <article className="tenants-card">
      <h3>Tenants</h3>
      <p>Join our growing community of active members.</p>
      <div className="gauge">
        <div className="gauge__arc" />
        <div className="gauge__value">
          <strong>8.5k</strong>
          <span>members</span>
        </div>
      </div>
    </article>
  </section>
)

export default DetailGrid
