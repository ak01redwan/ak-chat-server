import { useEffect, useRef } from 'react';
import { useT } from '../i18n';
import { LogoMark } from './icons';

interface CodeOfConductModalProps {
  onAccept: () => void;
}

export default function CodeOfConductModal({ onAccept }: CodeOfConductModalProps) {
  const acceptButtonRef = useRef<HTMLButtonElement>(null);
  const t = useT();

  useEffect(() => {
    acceptButtonRef.current?.focus();

    // Escape must not dismiss the guidelines: acceptance is required to chat.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      // Trap focus inside the dialog (there is exactly one focusable control).
      const focusable = acceptButtonRef.current;
      if (focusable && !event.shiftKey) {
        event.preventDefault();
        focusable.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="modal__overlay" role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coc-title"
        aria-describedby="coc-body"
      >
        <span className="modal__mark">
          <LogoMark size={32} />
        </span>
        <h2 id="coc-title" className="modal__title">
          {t.communityGuidelines}
        </h2>

        <div id="coc-body" className="modal__body">
          <p>{t.cocIntro}</p>
          <ul>
            <li>{t.cocPoint1}</li>
            <li>{t.cocPoint2}</li>
            <li>{t.cocPoint3}</li>
          </ul>
          <p>{t.cocOutro}</p>
        </div>

        <button ref={acceptButtonRef} className="btn btn--primary" type="button" onClick={onAccept}>
          {t.iAgree}
        </button>
      </div>
    </div>
  );
}
