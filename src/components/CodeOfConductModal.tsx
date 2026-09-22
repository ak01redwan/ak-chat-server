import { useEffect, useRef } from 'react';
import { LogoMark } from './icons';

interface CodeOfConductModalProps {
  onAccept: () => void;
}

export default function CodeOfConductModal({ onAccept }: CodeOfConductModalProps) {
  const acceptButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    acceptButtonRef.current?.focus();
  }, []);

  return (
    <div className="modal__overlay">
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
          Community guidelines
        </h2>

        <div id="coc-body" className="modal__body">
          <p>
            AK-CHAT welcomes everyone to chat and share updates. Respectful behavior is expected:
          </p>
          <ul>
            <li>Treat others kindly and avoid abusive language.</li>
            <li>Stick to the topic of AK01REDWAN's news and updates.</li>
            <li>Report any violations to moderators.</li>
          </ul>
          <p>
            Failure to follow these guidelines may result in warnings, suspension, or a ban. Enjoy
            your time in the chat!
          </p>
        </div>

        <button ref={acceptButtonRef} className="btn btn--primary" type="button" onClick={onAccept}>
          I agree
        </button>
      </div>
    </div>
  );
}
