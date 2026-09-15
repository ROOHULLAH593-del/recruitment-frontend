import { useState } from 'react'
import Button from './Button'
import Modal from './Modal'

// Themed replacement for window.confirm() — same Modal/Framer/GSAP entrance
// used everywhere else in the app, so it respects the active theme instead
// of rendering an unstyled native browser dialog. `onConfirm` may be async;
// the confirm button shows a "please wait" state and only the dialog closes
// once it resolves — Cancel stays enabled throughout, matching how the
// Schedule/Reschedule modals already handle their own submit-in-flight state.
export default function ConfirmDialog({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  onConfirm,
  onClose,
}) {
  const [isConfirming, setIsConfirming] = useState(false)

  return (
    <Modal title={title} onClose={onClose}>
      {(closeModal) => (
        <div className="space-y-5">
          <p className="text-sm text-ink/70">{message}</p>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeModal}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={variant}
              loading={isConfirming}
              onClick={async () => {
                setIsConfirming(true)
                try {
                  await onConfirm()
                } finally {
                  setIsConfirming(false)
                  closeModal()
                }
              }}
            >
              {isConfirming ? 'Please wait…' : confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
