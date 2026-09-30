import { useState } from 'react';
import type { MessageReactions } from '../types/message';
import { hasReacted, reactionCount, REACTION_EMOJIS } from '../utils/validation';
import { PlusIcon } from './icons';

interface ReactionsBarProps {
  reactions: MessageReactions | undefined;
  currentUserId: string;
  onToggle: (emoji: string) => void;
  disabled?: boolean;
}

export default function ReactionsBar({
  reactions,
  currentUserId,
  onToggle,
  disabled = false,
}: ReactionsBarProps) {
  const [picking, setPicking] = useState(false);

  const active = REACTION_EMOJIS.filter(
    (emoji) => reactionCount(reactions, emoji) > 0 || hasReacted(reactions, emoji, currentUserId)
  );
  const remaining = REACTION_EMOJIS.filter((emoji) => !active.includes(emoji));

  return (
    <div className="reactions">
      {active.map((emoji) => {
        const count = reactionCount(reactions, emoji);
        const mine = hasReacted(reactions, emoji, currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            className={`reaction ${mine ? 'reaction--mine' : ''}`}
            onClick={() => onToggle(emoji)}
            disabled={disabled}
            aria-pressed={mine}
            aria-label={`${emoji} reaction, ${count} ${count === 1 ? 'person' : 'people'}${
              mine ? ', you reacted' : ''
            }`}
            title={mine ? `Remove your ${emoji}` : `React with ${emoji}`}
          >
            <span className="reaction__emoji">{emoji}</span>
            {count > 0 && <span className="reaction__count">{count}</span>}
          </button>
        );
      })}

      {!disabled && remaining.length > 0 && (
        <div className="reactions__picker">
          <button
            type="button"
            className="reaction reaction--add"
            onClick={() => setPicking((p) => !p)}
            aria-expanded={picking}
            aria-label="Add a reaction"
            title="Add a reaction"
          >
            <PlusIcon size={12} />
          </button>
          {picking && (
            <>
              <span
                className="reactions__backdrop"
                role="presentation"
                onClick={() => setPicking(false)}
              />
              <div className="reactions__menu" role="group" aria-label="Choose an emoji">
                {remaining.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="reactions__menu-item"
                    onClick={() => {
                      onToggle(emoji);
                      setPicking(false);
                    }}
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
