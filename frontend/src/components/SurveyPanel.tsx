import type { HouseholdType } from '../api/analyze'
import Logo from './Logo'
import SurveyForm from './SurveyForm'

const SurveyPanel = ({
  isResults,
  anchorInput,
  onAnchorChange,
  budget,
  onBudgetChange,
  salary,
  onSalaryChange,
  commute,
  onCommuteChange,
  radius,
  onRadiusChange,
  household,
  onHouseholdChange,
  lifestyle,
  onLifestyleChange,
  onFindCommunities,
}: {
  isResults: boolean
  anchorInput: string
  onAnchorChange: (value: string) => void
  budget: number
  onBudgetChange: (value: number) => void
  salary: number
  onSalaryChange: (value: number) => void
  commute: number
  onCommuteChange: (value: number) => void
  radius: number
  onRadiusChange: (value: number) => void
  household: HouseholdType
  onHouseholdChange: (value: HouseholdType) => void
  lifestyle: string
  onLifestyleChange: (value: string) => void
  onFindCommunities: () => void
}) => (
  <section className={`survey ${isResults ? 'survey--sidebar' : ''}`}>
    <div className="survey__inner">
      <div className="survey__header">
        <Logo />
        {!isResults ? (
          <>
            <h1>Find the best place to live based on your life</h1>
            <p>From job or school to neighborhood recommendations in seconds</p>
          </>
        ) : null}
      </div>

      <SurveyForm
        isResults={isResults}
        anchorInput={anchorInput}
        onAnchorChange={onAnchorChange}
        budget={budget}
        onBudgetChange={onBudgetChange}
        salary={salary}
        onSalaryChange={onSalaryChange}
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
