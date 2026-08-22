export default function Modal({ title, onClose, children, footer, maxWidth = 'max-w-md' }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} rounded-md bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-15 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-90">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-40 hover:text-gray-70"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-gray-15 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
