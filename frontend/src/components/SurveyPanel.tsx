import type { HouseholdType } from '../api/analyze'
import Logo from './Logo'
import SurveyForm from './SurveyForm'
import type { HousingMode } from '../types/app'

const SurveyPanel = ({
  isResults,
  housingMode,
  onHousingModeChange,
  anchorInput,
  onAnchorChange,
  budget,
  onBudgetChange,
  maxHomePrice,
  onMaxHomePriceChange,
  commute,
  onCommuteChange,
  radius,
  onRadiusChange,
  household,
  onHouseholdChange,
  lifestyle,
  onLifestyleChange,
  onFindCommunities,
  onResultsLogoClick,
}: {
  isResults: boolean
  housingMode: HousingMode
  onHousingModeChange: (value: HousingMode) => void
  anchorInput: string
  onAnchorChange: (value: string) => void
  budget: number
  onBudgetChange: (value: number) => void
  maxHomePrice: number
  onMaxHomePriceChange: (value: number) => void
  commute: number
  onCommuteChange: (value: number) => void
  radius: number
  onRadiusChange: (value: number) => void
  household: HouseholdType
  onHouseholdChange: (value: HouseholdType) => void
  lifestyle: string
  onLifestyleChange: (value: string) => void
  onFindCommunities: () => void
  onResultsLogoClick: () => void
}) => (
  <section className={`survey ${isResults ? 'survey--sidebar' : ''}`}>
    <div className="survey__inner">
      <div className="survey__header">
        <Logo clickable={isResults} onClick={isResults ? onResultsLogoClick : undefined} />
        {!isResults ? (
          <>
            <h1>Find the best place to live based on your life</h1>
          </>
        ) : null}
      </div>

      <SurveyForm
        isResults={isResults}
        housingMode={housingMode}
        onHousingModeChange={onHousingModeChange}
        anchorInput={anchorInput}
        onAnchorChange={onAnchorChange}
        budget={budget}
        onBudgetChange={onBudgetChange}
        maxHomePrice={maxHomePrice}
        onMaxHomePriceChange={onMaxHomePriceChange}
        commute={commute}
        onCommuteChange={onCommuteChange}
        radius={radius}
        onRadiusChange={onRadiusChange}
        household={household}
        onHouseholdChange={onHouseholdChange}
        lifestyle={lifestyle}
        onLifestyleChange={onLifestyleChange}
      />
    </div>

    <div className="survey__footer">
      {!isResults && (
        <button className="cta" type="button" onClick={onFindCommunities}>
          Find Communities
        </button>
      )}
    </div>
  </section>
)

export default SurveyPanel
