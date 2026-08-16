import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { IconClose } from './Icons';
import { usePrefs } from '../lib/prefs';
import { useSheetPortal } from '../lib/sheetPortal';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** The one sanctioned pattern for secondary screens (BUILD.md §3: "no nested navigation except sheets"). */
export function Sheet({ open, onClose, title, children }: Props) {
  const { reduceMotion } = usePrefs();
  const portalTarget = useSheetPortal();
  const springOrInstant = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 380, damping: 34, mass: 1 };

  /* Falling back to document.body rather than rendering nothing.
     SheetPortalProvider exists to escape `.track`'s transform, which only
     matters inside the tab pager; a sheet opened from a screen outside it — the
     catch-up screen, before the app — has no track to escape and rendering
     null there is simply a sheet that does not open. */
  const target = portalTarget ?? (typeof document === 'undefined' ? null : document.body);
  if (!target) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
            onClick={onClose}
          />
          <motion.div
            className="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springOrInstant}
          >
            <div className="sheet-handle" />
            <div className="sheet-head">
              <span className="t-section">{title}</span>
              <button className="sheet-close pressable" onClick={onClose} aria-label="Close">
                <IconClose size={16} color="var(--t2)" />
              </button>
            </div>
            <div className="sheet-body">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    target,
  );
}
