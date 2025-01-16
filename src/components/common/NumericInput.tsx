import { OptionalNumber, NumericInputProps } from '@/types/global'

export function NumericInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  className = '',
  required = false,
  disabled = false
}: NumericInputProps) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const newValue = e.target.value === '' ? undefined : Number(e.target.value)
        onChange(newValue)
      }}
      min={min}
      max={max}
      step={step}
      className={className}
      required={required}
      disabled={disabled}
    />
  )
} 