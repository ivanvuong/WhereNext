import type { RefObject } from 'react'
import type { ResolvedAnchor, RankedCommunity, TopCard } from '../types/app'
import { formatCurrency } from '../utils/format'

const MapPanel = ({
  mapboxToken,
  mapboxTokenInput,
  onMapboxTokenInput,
  onSaveMapboxToken,
  mapContainerRef,
  selected,
  topCard,
  anchorLabel,
  anchor,
}: {
  mapboxToken: string
  mapboxTokenInput: string
  onMapboxTokenInput: (value: string) => void
  onSaveMapboxToken: () => void
  mapContainerRef: RefObject<HTMLDivElement>
  selected: RankedCommunity | null
  topCard: TopCard | null
  anchorLabel: string | null
  anchor: ResolvedAnchor
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

      {selected && topCard ? (
        <div className="summary-floats">
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
      ) : null}

    </div>
  </article>
)

export default MapPanel
