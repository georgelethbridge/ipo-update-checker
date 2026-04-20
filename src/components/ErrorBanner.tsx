export default function ErrorBanner({
  message,
  onDismiss
}: {
  message: string | null;
  onDismiss?: () => void;
}) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert" aria-live="polite">
      <span>{message}</span>
      {onDismiss && (
        <button type="button" className="ghost error-banner__dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  );
}
