import { useEffect, useRef } from 'react';
import { useT } from '../i18n';

interface ConfirmationModalProps {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const firstRef = useRef<HTMLButtonElement>(null);
  const t = useT();

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="modal__overlay" role="presentation" onClick={onCancel}>
      <div
        className="modal modal--compact"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="modal__title">
          {title}
        </h2>
        <p id="confirm-body" className="modal__body">
          {body}
        </p>
        <div className="modal__actions">
          <button ref={firstRef} className="btn btn--ghost" type="button" onClick={onCancel}>
            {cancelLabel ?? t.cancel}
          </button>
          <button className="btn btn--danger" type="button" onClick={onConfirm}>
            {confirmLabel ?? t.delete}
          </button>
        </div>
      </div>
    </div>
  );
}
