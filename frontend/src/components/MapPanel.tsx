import type { RefObject } from 'react'
import type { PropertyListing, RankedCommunity } from '../types/app'
import type { HousingMode } from '../types/app'
import { formatPropertyPrice, getListingExternalLink } from '../utils/properties'
import { formatCurrency } from '../utils/format'

const MapPanel = ({
  mapContainerRef,
  selected,
  selectedOverview,
  housingMode,
  onCloseNeighborhood,
  selectedProperty,
  onClosePropertyDetail,
}: {
  mapContainerRef: RefObject<HTMLDivElement | null>
  selected: RankedCommunity | null
  selectedOverview: string
  housingMode: HousingMode
  onCloseNeighborhood: () => void
  selectedProperty: PropertyListing | null
  onClosePropertyDetail: () => void
}) => {
  const externalListingLink = selectedProperty ? getListingExternalLink(selectedProperty) : null

  return (
    <article className="map-panel">
      <div className="map-canvas" role="img" aria-label="Community recommendation map">
        <div className="mapbox-container" ref={mapContainerRef} />
        {selected ? (
          <aside className="map-neighborhood-overlay" aria-live="polite">
            <div className="map-neighborhood-overlay__head">
              <h3>{selected.name}</h3>
              <button type="button" className="map-neighborhood-overlay__close" onClick={onCloseNeighborhood} aria-label="Close neighborhood">
                X
              </button>
            </div>
            <p>{selectedOverview}</p>
            <div className="map-neighborhood-overlay__chips">
              <span>Match {Math.round(selected.overallScore)}</span>
              <span>Commute {Math.round(selected.commuteScore)}</span>
              <span>Cost {Math.round(selected.affordabilityScore)}</span>
              <span>Lifestyle {Math.round(selected.lifestyleScore)}</span>
            </div>
            {/* Good/tradeoff already shown in the neighborhood cards below; avoid duplicate copy here. */}
            {housingMode === 'rent' ? <p className="map-neighborhood-overlay__rent">Avg rent {formatCurrency(selected.avgRent)}</p> : null}
          </aside>
        ) : null}
        {selectedProperty ? (
          <div className="map-property-detail">
            <div className="map-property-detail__header">
              <h4>Home Details</h4>
              <button type="button" className="panel-close" onClick={onClosePropertyDetail} aria-label="Close home details">
                X
              </button>
            </div>
            <p className="map-property-detail__address">{selectedProperty.address}</p>
            <p className="map-property-detail__price">
              {formatPropertyPrice(selectedProperty)}
            </p>
            <p className="map-property-detail__meta">
              {selectedProperty.beds ?? '-'} bd · {selectedProperty.baths ?? '-'} ba · {selectedProperty.sqft ? `${selectedProperty.sqft.toLocaleString()} sqft` : 'sqft -'}
            </p>
            <div className="map-property-detail__footer">
              <div className="map-property-detail__summary">
                {selectedProperty.estimatedCommuteMinutes !== null ? (
                  <p className="map-property-detail__meta">Estimated commute: ~{selectedProperty.estimatedCommuteMinutes} min</p>
                ) : null}
                <p className="map-property-detail__meta">Status: {selectedProperty.status.replaceAll('_', ' ')}</p>
              </div>
              {externalListingLink ? (
                <a href={externalListingLink.href} target="_blank" rel="noreferrer" className="map-property-detail__cta">
                  {externalListingLink.label}
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}

export default MapPanel
