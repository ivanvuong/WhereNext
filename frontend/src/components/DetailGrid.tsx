import type { PropertyListing, RankedCommunity, ResolvedAnchor } from '../types/app'
import { formatPropertyPrice } from '../utils/properties'

const DetailGrid = ({
  selected,
  anchorLabel,
  anchor,
  properties,
  isPropertiesLoading,
  propertyNotice,
  isNeighborhoodFocused,
  onCloseNeighborhood,
  selectedPropertyId,
  onSelectProperty,
}: {
  selected: RankedCommunity
  anchorLabel: string | null
  anchor: ResolvedAnchor
  properties: PropertyListing[]
  isPropertiesLoading: boolean
  propertyNotice: string | null
  isNeighborhoodFocused: boolean
  onCloseNeighborhood: () => void
  selectedPropertyId: string | null
  onSelectProperty: (id: string) => void
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
        <div>
          <h3>Homes</h3>
          <p>
            {isNeighborhoodFocused
              ? `Showing homes in ${selected.name}.`
              : 'Click a yellow neighborhood on the map or top choices to drill in.'}
          </p>
        </div>
        {isNeighborhoodFocused ? (
          <button type="button" className="panel-close" onClick={onCloseNeighborhood} aria-label="Close neighborhood homes">
            X
          </button>
        ) : null}
      </div>

      <div className="property-list">
        {!isNeighborhoodFocused ? (
          <p className="property-meta">Neighborhood-level homes appear after selecting a neighborhood.</p>
        ) : null}
        {isNeighborhoodFocused && isPropertiesLoading ? <p className="property-meta">Loading homes...</p> : null}
        {isNeighborhoodFocused && !isPropertiesLoading && propertyNotice ? <p className="property-meta">{propertyNotice}</p> : null}
        {isNeighborhoodFocused && !isPropertiesLoading && !propertyNotice && properties.length === 0 ? (
          <p className="property-meta">No homes available yet.</p>
        ) : null}
        {isNeighborhoodFocused &&
          !isPropertiesLoading &&
          properties.map((home) => (
            <button
              key={home.id}
              type="button"
              className={`property-item property-item--selectable ${selectedPropertyId === home.id ? 'property-item--active' : ''}`}
              onClick={() => onSelectProperty(home.id)}
            >
              {home.primaryPhoto ? (
                <img className="property-item__image" src={home.primaryPhoto} alt={home.address} loading="lazy" />
              ) : (
                <div className="property-item__image property-item__image--fallback" aria-hidden />
              )}
              <div className="property-item__body">
                <h4>{home.address}</h4>
                <p className="property-item__price">
                  {formatPropertyPrice(home)}
                </p>
                <p className="property-item__stats">
                  {home.beds ?? '-'} bd · {home.baths ?? '-'} ba · {home.sqft ? `${home.sqft.toLocaleString()} sqft` : 'sqft -'}
                </p>
              </div>
            </button>
          ))}
      </div>
    </article>
  </section>
)

export default DetailGrid
