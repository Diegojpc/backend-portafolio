// Feedback card for the contact form (replaces window.alert).
// Rendered in a portal on <body>: the Contact section sits inside transformed (animated) ancestors,
// which would otherwise become the containing block of a position:fixed element.
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

const SUCCESS_MS = 9000;

const SuccessIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const ErrorIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M12 7v6M12 17h.01" />
  </svg>
);

/**
 * toast: null | { kind: 'success' | 'error', title, body, mailtoHref? }
 */
const ContactToast = ({ toast, onClose, onRetry, labels }) => {
  // Success closes itself; an error stays until the visitor acts on it. Esc always closes.
  useEffect(() => {
    if (!toast) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const timer = toast.kind === 'success' ? setTimeout(onClose, SUCCESS_MS) : null;
    return () => {
      window.removeEventListener('keydown', onKey);
      if (timer) clearTimeout(timer);
    };
  }, [toast, onClose]);

  const isError = toast?.kind === 'error';
  const tone = isError ? 'text-[#F6019D] border-[#F6019D]/40 bg-[#F6019D]/10' : 'text-accent border-accent/40 bg-accent/10';

  // The fixed wrapper does the centring: framer-motion owns the card's `transform`, so a Tailwind
  // translate on the card itself would be overwritten. Phones: lifted above the chat launcher.
  return createPortal(
    <div className="fixed z-[60] inset-x-0 bottom-[96px] sm:bottom-8 flex justify-center px-4 pointer-events-none">
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.kind + toast.title}
          role={isError ? 'alert' : 'status'}
          aria-live={isError ? 'assertive' : 'polite'}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="pointer-events-auto w-full max-w-[440px] overflow-hidden rounded-2xl border border-white/10 bg-[#0E0E15] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]"
        >
          <div className="flex gap-4 p-5">
            <span className={`shrink-0 w-11 h-11 rounded-full border flex items-center justify-center ${tone}`}>
              {isError ? <ErrorIcon /> : <SuccessIcon />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-display text-[18px] font-semibold text-white">{toast.title}</p>
              <p className="mt-1.5 text-[14px] leading-[1.6] text-soft">{toast.body}</p>
              {isError && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="h-10 px-4 rounded-full bg-accent text-ink text-[14px] font-semibold hover:brightness-110 transition"
                  >
                    {labels.retry}
                  </button>
                  {toast.mailtoHref && (
                    <a
                      href={toast.mailtoHref}
                      className="h-10 px-4 inline-flex items-center rounded-full border border-white/15 text-white text-[14px] hover:border-accent/60 hover:text-accent transition-colors"
                    >
                      {labels.emailInstead}
                    </a>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={labels.close}
              className="shrink-0 -mt-1.5 -mr-1.5 w-11 h-11 rounded-full text-muted hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          {!isError && (
            <motion.div
              className="h-[3px] bg-accent origin-left"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: SUCCESS_MS / 1000, ease: 'linear' }}
              aria-hidden="true"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
    </div>,
    document.body,
  );
};

export default ContactToast;
