import type { PropertyListing, RankedCommunity, ResolvedAnchor } from '../types/app'

const DetailGrid = ({
  selected,
  anchorLabel,
  anchor,
  properties,
  isPropertiesLoading,
  propertyNotice,
}: {
  selected: RankedCommunity
  anchorLabel: string | null
  anchor: ResolvedAnchor
  properties: PropertyListing[]
  isPropertiesLoading: boolean
  propertyNotice: string | null
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

    <article className="property-card" aria-label="Homes in selected neighborhood">
      <div className="property-card__header">
        <h3>Homes</h3>
        <p>Listings that align with your current filters.</p>
      </div>
      <div className="property-list">
        {isPropertiesLoading ? <p className="property-meta">Loading homes...</p> : null}
        {!isPropertiesLoading && propertyNotice ? <p className="property-meta">{propertyNotice}</p> : null}
        {!isPropertiesLoading && !propertyNotice && properties.length === 0 ? (
          <p className="property-meta">No homes available yet.</p>
        ) : null}
        {!isPropertiesLoading &&
          properties.map((home) => (
            <article key={home.id} className="property-item">
              {home.primaryPhoto ? (
                <img className="property-item__image" src={home.primaryPhoto} alt={home.address} loading="lazy" />
              ) : (
                <div className="property-item__image property-item__image--fallback" aria-hidden />
              )}
              <div className="property-item__body">
                <h4>{home.address}</h4>
                <p className="property-item__price">
                  {home.listPrice ? `$${home.listPrice.toLocaleString()}` : 'Price unavailable'}
                </p>
                <p className="property-item__stats">
                  {home.beds ?? '-'} bd · {home.baths ?? '-'} ba · {home.sqft ? `${home.sqft.toLocaleString()} sqft` : 'sqft -'}
                </p>
                <p className="property-item__status">{home.status.replaceAll('_', ' ')}</p>
                {home.detailUrl ? (
                  <a href={home.detailUrl} target="_blank" rel="noreferrer" className="property-item__link">
                    View listing
                  </a>
                ) : null}
              </div>
            </article>
          ))}
      </div>
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
