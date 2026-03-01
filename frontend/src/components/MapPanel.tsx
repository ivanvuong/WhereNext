import type { RefObject } from 'react'
import type { PropertyListing } from '../types/app'
import { formatPropertyPrice } from '../utils/properties'

const MapPanel = ({
  mapboxToken,
  mapboxTokenInput,
  onMapboxTokenInput,
  onSaveMapboxToken,
  mapContainerRef,
  selectedProperty,
  onClosePropertyDetail,
}: {
  mapboxToken: string
  mapboxTokenInput: string
  onMapboxTokenInput: (value: string) => void
  onSaveMapboxToken: () => void
  mapContainerRef: RefObject<HTMLDivElement | null>
  selectedProperty: PropertyListing | null
  onClosePropertyDetail: () => void
}) => (
  <article className="map-panel">
    <div className="map-canvas" role="img" aria-label="Community recommendation map">
      {!mapboxToken ? (
        <div className="mapbox-missing">
          <h3>Mapbox token missing</h3>
          <p>Set `VITE_MAPBOX_TOKEN` in your local `.env` or paste a token below.</p>
          <div className="mapbox-token">
            <input
              type="password"
              value={mapboxTokenInput}
              onChange={(event) => onMapboxTokenInput(event.target.value)}
              placeholder="pk.eyJ1Ijo..."
              aria-label="Mapbox access token"
            />
            <button type="button" onClick={onSaveMapboxToken}>
              Save Token
            </button>
          </div>
        </div>
      ) : (
        <div className="mapbox-container" ref={mapContainerRef} />
      )}
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
          <p className="map-property-detail__meta">Status: {selectedProperty.status.replaceAll('_', ' ')}</p>
          {selectedProperty.detailUrl ? (
            <a href={selectedProperty.detailUrl} target="_blank" rel="noreferrer" className="property-item__link">
              View full listing
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  </article>
)

export default MapPanel
