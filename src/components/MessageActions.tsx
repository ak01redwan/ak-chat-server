import { useState } from 'react';
import { useT } from '../i18n';
import { CopyIcon, EditIcon, ReplyIcon, TrashIcon } from './icons';

interface MessageActionsProps {
  isOwn: boolean;
  onCopy: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function MessageActions({
  isOwn,
  onCopy,
  onReply,
  onEdit,
  onDelete,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const t = useT();

  function handleCopy() {
    onCopy();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="message__actions">
      <button
        type="button"
        className="message__action"
        onClick={handleCopy}
        aria-label={copied ? t.copied : t.copyMessage}
        title={copied ? t.copiedTooltip : t.copy}
      >
        <CopyIcon size={14} />
      </button>

      <button
        type="button"
        className="message__action"
        onClick={onReply}
        aria-label={t.replyToMessage}
        title={t.reply}
      >
        <ReplyIcon size={14} />
      </button>

      {isOwn && (
        <>
          <button
            type="button"
            className="message__action"
            onClick={onEdit}
            aria-label={t.editYourMessage}
            title={t.edit}
          >
            <EditIcon size={14} />
          </button>
          <button
            type="button"
            className="message__action message__action--danger"
            onClick={onDelete}
            aria-label={t.deleteYourMessage}
            title={t.delete}
          >
            <TrashIcon size={14} />
          </button>
        </>
      )}
    </div>
  );
}
