import type { RefObject } from 'react'
import type { PropertyListing, RankedCommunity, ResolvedAnchor, TopCard } from '../types/app'
import MapPanel from './MapPanel'
import SummaryCards from './SummaryCards'
import RecommendationList from './RecommendationList'
import DetailGrid from './DetailGrid'
import WorkspaceEmpty from './WorkspaceEmpty'

const ResultsView = ({
  notice,
  hasResults,
  hasSearched,
  isLoading,
  onUpdateResults,
  mapboxToken,
  mapboxTokenInput,
  onMapboxTokenInput,
  onSaveMapboxToken,
  mapContainerRef,
  selected,
  topCard,
  anchorLabel,
  anchor,
  results,
  selectedId,
  onSelect,
  buildReason,
  buildTradeoff,
  properties,
  isPropertiesLoading,
  propertyNotice,
  isNeighborhoodFocused,
  onCloseNeighborhood,
  selectedProperty,
  selectedPropertyId,
  onSelectProperty,
  onClosePropertyDetail,
}: {
  notice: string | null
  hasResults: boolean
  hasSearched: boolean
  isLoading: boolean
  onUpdateResults: () => void
  mapboxToken: string
  mapboxTokenInput: string
  onMapboxTokenInput: (value: string) => void
  onSaveMapboxToken: () => void
  mapContainerRef: RefObject<HTMLDivElement | null>
  selected: RankedCommunity | null
  topCard: TopCard | null
  anchorLabel: string | null
  anchor: ResolvedAnchor
  results: RankedCommunity[]
  selectedId: string | null
  onSelect: (id: string) => void
  buildReason: (item: RankedCommunity) => string
  buildTradeoff: (item: RankedCommunity) => string
  properties: PropertyListing[]
  isPropertiesLoading: boolean
  propertyNotice: string | null
  isNeighborhoodFocused: boolean
  onCloseNeighborhood: () => void
  selectedProperty: PropertyListing | null
  selectedPropertyId: string | null
  onSelectProperty: (id: string) => void
  onClosePropertyDetail: () => void
}) => (
  <section className="workspace">
    {notice ? <p className="workspace-notice">{notice}</p> : null}

    {!hasResults ? (
      <WorkspaceEmpty hasSearched={hasSearched} isLoading={isLoading} onUpdateResults={onUpdateResults} />
    ) : (
      <div className="workspace-results">
        {topCard ? <SummaryCards topCard={topCard} /> : null}
        <MapPanel
          mapboxToken={mapboxToken}
          mapboxTokenInput={mapboxTokenInput}
          onMapboxTokenInput={onMapboxTokenInput}
          onSaveMapboxToken={onSaveMapboxToken}
          mapContainerRef={mapContainerRef}
          selectedProperty={selectedProperty}
          onClosePropertyDetail={onClosePropertyDetail}
        />

        <RecommendationList
          results={results}
          selectedId={selectedId}
          onSelect={onSelect}
          buildReason={buildReason}
          buildTradeoff={buildTradeoff}
        />

        {selected ? (
          <DetailGrid
            selected={selected}
            anchorLabel={anchorLabel}
            anchor={anchor}
            properties={properties}
            isPropertiesLoading={isPropertiesLoading}
            propertyNotice={propertyNotice}
            isNeighborhoodFocused={isNeighborhoodFocused}
            onCloseNeighborhood={onCloseNeighborhood}
            selectedPropertyId={selectedPropertyId}
            onSelectProperty={onSelectProperty}
          />
        ) : null}
      </div>
    )}
  </section>
)

export default ResultsView
