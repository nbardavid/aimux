import { uiTokens } from '../ui-tokens'
import { InputField } from './input-field'
import { ModalShell } from './modal-shell'

export function SessionNameModal({ title, value }: { title: string; value: string }) {
  return (
    <ModalShell
      title={title}
      help="Type a session name. Enter confirm, Esc cancel."
      width={uiTokens.modalWidth.md}
    >
      <InputField active value={value} />
    </ModalShell>
  )
}
