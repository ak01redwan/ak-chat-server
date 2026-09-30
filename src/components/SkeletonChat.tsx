/**
 * Shimmering placeholder bubbles shown while the first page of messages loads.
 * Purely decorative — the parent announces loading via role="status".
 */
export default function SkeletonChat() {
  const rows = [
    { own: false, lines: [70, 45] },
    { own: false, lines: [55] },
    { own: true, lines: [60, 35] },
    { own: false, lines: [80, 50] },
    { own: true, lines: [50] },
  ];

  return (
    <div className="skeleton" data-testid="chat-skeleton" aria-hidden="true">
      {rows.map((row, rowIndex) => (
        <div className={`skeleton__row ${row.own ? 'skeleton__row--own' : ''}`} key={rowIndex}>
          <span className="skeleton__avatar" />
          <div className="skeleton__bubble">
            {row.lines.map((width, lineIndex) => (
              <span className="skeleton__line" key={lineIndex} style={{ width: `${width}%` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
