'use client';

/**
 * A loading placeholder sized to the table it replaces.
 *
 * Row height and column count match the real table, so content does not jump
 * when data arrives. The shimmer is suppressed for users who asked for reduced
 * motion; the layout reservation, which is the actual purpose, remains.
 */
export function TableSkeleton({
  rows = 5,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div role="status" aria-label="Loading" style={{ padding: 'var(--space-m)' }}>
      <style>{`
        @keyframes r53-shimmer {
          0% { opacity: 0.55; }
          50% { opacity: 0.9; }
          100% { opacity: 0.55; }
        }
        .r53-skeleton-cell {
          height: 14px;
          border-radius: 4px;
          background: var(--surface-sunken);
          animation: r53-shimmer 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .r53-skeleton-cell { animation: none; }
        }
      `}</style>

      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 'var(--space-l)',
            padding: 'var(--space-m) 0',
            borderBottom: 'var(--border-width) solid var(--border-subtle)',
          }}
        >
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <div
              key={columnIndex}
              className="r53-skeleton-cell"
              style={{
                // Varying widths read as text rather than as a progress bar.
                width: `${[85, 55, 70, 45, 78, 60][(rowIndex + columnIndex) % 6]}%`,
                animationDelay: `${(rowIndex * columns + columnIndex) * 40}ms`,
              }}
            />
          ))}
        </div>
      ))}
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        Loading data
      </span>
    </div>
  );
}
