import type { RefObject } from 'react'
import type { PropertyListing, RankedCommunity } from '../types/app'
import type { HousingMode } from '../types/app'
import MapPanel from './MapPanel'
import RecommendationList from './RecommendationList'
import DetailGrid from './DetailGrid'
import WorkspaceEmpty from './WorkspaceEmpty'

const ResultsView = ({
  notice,
  hasResults,
  hasSearched,
  isLoading,
  onUpdateResults,
  mapContainerRef,
  selected,
  selectedOverview,
  housingMode,
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
  mapContainerRef: RefObject<HTMLDivElement | null>
  selected: RankedCommunity | null
  selectedOverview: string
  housingMode: HousingMode
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
        <MapPanel
          mapContainerRef={mapContainerRef}
          selected={selected}
          selectedOverview={selectedOverview}
          housingMode={housingMode}
          onCloseNeighborhood={onCloseNeighborhood}
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
