import { useId, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useBodyScrollLock, useEscapeKey, useFocusTrap } from '../../hooks/useOverlay'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  maxWidth?: string
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}: ModalProps) {
  const { t } = useTranslation()
  const modalRef = useRef<HTMLDivElement>(null)
  // Names the dialog for screen readers. Without it every one of these dialogs
  // announces as an unnamed "dialog" — and the focus trap lands on the close
  // button, so the first thing read out was just "button".
  const titleId = useId()

  // Scroll lock / Escape / focus trap all live in useOverlay so Sheet shares
  // exactly this behaviour. The scroll lock is ref-counted, so a Sheet opening
  // on top of a Modal no longer unlocks the page when it closes.
  useBodyScrollLock(isOpen)
  useEscapeKey(isOpen, onClose)
  useFocusTrap(modalRef, isOpen)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal content */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={e => e.stopPropagation()}
        className={`relative w-full ${maxWidth} max-h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col animate-[modal-in_150ms_ease-out] [--tw-enter-opacity:0] [--tw-enter-scale:0.95]`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            {/* id lives on the wrapper so a ReactNode title names the dialog too. */}
            <div className="flex-1 min-w-0" id={titleId}>
              {typeof title === 'string' ? (
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
              ) : (
                title
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        {children}
      </div>
    </div>
  )
}
