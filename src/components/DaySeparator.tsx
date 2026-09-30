interface DaySeparatorProps {
  label: string;
}

export default function DaySeparator({ label }: DaySeparatorProps) {
  return (
    <div className="day-separator" role="separator" aria-label={label}>
      <span className="day-separator__label">{label}</span>
    </div>
  );
}
