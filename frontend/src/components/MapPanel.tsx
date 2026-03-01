import type { RefObject } from 'react'
import type { ResolvedAnchor, RankedCommunity } from '../types/app'

const MapPanel = ({
  mapboxToken,
  mapboxTokenInput,
  onMapboxTokenInput,
  onSaveMapboxToken,
  mapContainerRef,
  selected,
  anchorLabel,
  anchor,
}: {
  mapboxToken: string
  mapboxTokenInput: string
  onMapboxTokenInput: (value: string) => void
  onSaveMapboxToken: () => void
  mapContainerRef: RefObject<HTMLDivElement>
  selected: RankedCommunity | null
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

    </div>
  </article>
)

export default MapPanel
