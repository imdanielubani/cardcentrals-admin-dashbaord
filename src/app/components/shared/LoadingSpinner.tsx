interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  fullPage?: boolean;
}

/**
 * Animated spinner. Use `fullPage` to center it in the viewport.
 */
export function LoadingSpinner({
  size = 32,
  color = '#0159C7',
  fullPage = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className="rounded-full border-[3px] border-t-transparent animate-spin"
      style={{
        width: size,
        height: size,
        borderColor: `${color}40`,
        borderTopColor: color,
      }}
    />
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * Full-page loading skeleton for initial page loads.
 */
export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <LoadingSpinner size={36} />
    </div>
  );
}
