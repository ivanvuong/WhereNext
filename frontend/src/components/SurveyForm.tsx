import type { HouseholdType } from '../api/analyze'
import MetricSlider from './MetricSlider'
import SearchIcon from './icons/SearchIcon'
import { toTitle } from '../utils/format'

const HOUSEHOLD_OPTIONS: HouseholdType[] = ['single', 'couple', 'family', 'with pets']

const SurveyForm = ({
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
}) => (
  <form
    className={`survey-form ${!isResults ? 'survey-form--landing' : ''}`}
    onSubmit={(event) => event.preventDefault()}
  >
    <div className="field-group">
      <label htmlFor="anchor">Where will you work or study?</label>
      <div className="search-field">
        <span className="search-field__icon" aria-hidden="true">
          <SearchIcon />
        </span>
        <input
          id="anchor"
          type="text"
          value={anchorInput}
          onChange={(event) => onAnchorChange(event.target.value)}
          placeholder="e.g. Stripe, UCI, Google SF"
        />
      </div>
    </div>

    <div className={`slider-grid ${!isResults ? 'slider-grid--split' : ''}`}>
      <MetricSlider
        id="budget"
        label="Monthly Rent Budget"
        value={budget}
        min={1200}
        max={7000}
        step={50}
        suffix="$"
        onChange={onBudgetChange}
      />
      <MetricSlider
        id="salary"
        label="Annual Salary"
        value={salary}
        min={35000}
        max={350000}
        step={1000}
        suffix="$"
        optional
        onChange={onSalaryChange}
      />
    </div>

    <MetricSlider
      id="commute"
      label="Max Commute Time"
      value={commute}
      min={5}
      max={90}
      step={1}
      suffix="min"
      onChange={onCommuteChange}
    />

    <MetricSlider
      id="radius"
      label="Search Radius"
      value={radius}
      min={1}
      max={30}
      step={1}
      suffix="miles"
      onChange={onRadiusChange}
    />
    <p className="caption">We&apos;ll find communities within this range</p>

    <div className="field-group">
      <label>Household Type</label>
      <div className="chip-row">
        {HOUSEHOLD_OPTIONS.map((option) => (
          <button
            key={option}
            className={`chip ${household === option ? 'chip--active' : ''}`}
            type="button"
            onClick={() => onHouseholdChange(option)}
          >
            {toTitle(option)}
          </button>
        ))}
      </div>
    </div>

    <div className="field-group">
      <label htmlFor="lifestyle">Lifestyle Preferences</label>
      <textarea
        id="lifestyle"
        value={lifestyle}
        onChange={(event) => onLifestyleChange(event.target.value)}
        placeholder="e.g. walkable, quiet, food scene, nightlife, outdoors..."
      />
    </div>
  </form>
)

export default SurveyForm
