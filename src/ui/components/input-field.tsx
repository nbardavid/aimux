import { theme } from '../theme'
import { Surface } from './surface'

interface InputFieldProps {
  active: boolean
  value: string
}

export function InputField({ active, value }: InputFieldProps) {
  return (
    <Surface tone={active ? 'inputActive' : 'input'} padding={1}>
      <text fg={active ? theme.text : theme.textMuted}>
        {value}
        {active ? '_' : ''}
      </text>
    </Surface>
  )
}
