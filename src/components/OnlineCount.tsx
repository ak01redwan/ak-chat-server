import { useT } from '../i18n';
import { OnlineDot } from './icons';

interface OnlineCountProps {
  count: number;
  ready: boolean;
}

export default function OnlineCount({ count, ready }: OnlineCountProps) {
  const t = useT();

  return (
    <span className="online-count" data-testid="online-count">
      <span className={`online-count__dot ${ready && count > 0 ? 'online-count__dot--live' : ''}`}>
        <OnlineDot size={8} />
      </span>
      {ready ? t.online(count) : t.loading}
    </span>
  );
}
