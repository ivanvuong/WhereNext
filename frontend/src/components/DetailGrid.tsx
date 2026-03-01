import type { PropertyListing, RankedCommunity } from '../types/app'
import { formatPropertyPrice } from '../utils/properties'

const DetailGrid = ({
  selected,
  properties,
  isPropertiesLoading,
  propertyNotice,
  isNeighborhoodFocused,
  onCloseNeighborhood,
  selectedPropertyId,
  onSelectProperty,
}: {
  selected: RankedCommunity
  properties: PropertyListing[]
  isPropertiesLoading: boolean
  propertyNotice: string | null
  isNeighborhoodFocused: boolean
  onCloseNeighborhood: () => void
  selectedPropertyId: string | null
  onSelectProperty: (id: string) => void
}) => (
  <section className="detail-grid">
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
                  {home.estimatedCommuteMinutes !== null ? ` · ~${home.estimatedCommuteMinutes} min` : ''}
                </p>
              </div>
            </button>
          ))}
      </div>
    </article>
  </section>
)

export default DetailGrid
