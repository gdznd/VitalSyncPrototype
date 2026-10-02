import type { Range } from '../types/range'

export interface RangeSelectProps {
  value: Range
  setValue: (x: Range) => void
}

export function RangeSelect({ value, setValue }: RangeSelectProps) {
  return (
    <select
      className="period"
      value={value}
      onChange={(e) => setValue(e.target.value as Range)}
    >
      {(['Today', 'Past 3 days', 'Past week', 'Past month'] as Range[]).map((item) => (
        <option key={item}>{item}</option>
      ))}
    </select>
  )
}
