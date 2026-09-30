import { useState } from 'react';
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
        aria-label={copied ? 'Copied' : 'Copy message'}
        title={copied ? 'Copied' : 'Copy'}
      >
        <CopyIcon size={14} />
      </button>

      <button
        type="button"
        className="message__action"
        onClick={onReply}
        aria-label="Reply to this message"
        title="Reply"
      >
        <ReplyIcon size={14} />
      </button>

      {isOwn && (
        <>
          <button
            type="button"
            className="message__action"
            onClick={onEdit}
            aria-label="Edit your message"
            title="Edit"
          >
            <EditIcon size={14} />
          </button>
          <button
            type="button"
            className="message__action message__action--danger"
            onClick={onDelete}
            aria-label="Delete your message"
            title="Delete"
          >
            <TrashIcon size={14} />
          </button>
        </>
      )}
    </div>
  );
}
