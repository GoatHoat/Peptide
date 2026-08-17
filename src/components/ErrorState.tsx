/**
 * A list that did not load, and the one thing worth doing about it.
 *
 * Every fetch in the app was a bare `.then()`. A rejection did not surface —
 * it left the screen on its loading state forever, which reads as an app that
 * has hung rather than a request that failed. This is what those catches
 * render instead.
 *
 * The message is always ours. A PostgREST string or a `TypeError: Failed to
 * fetch` tells somebody nothing they can act on and quite a lot about the
 * inside of the app; the real error goes to the console, where it is useful.
 */
interface Props {
  /** one line, plain, in the app's voice — never an exception's text */
  message?: string;
  onRetry: () => void;
  /** the label on the retry, when "Try again" is not the right words */
  retryLabel?: string;
}

export function ErrorState({
  message = 'That did not load. It is usually the connection.',
  onRetry,
  retryLabel = 'Try again',
}: Props) {
  return (
    <div className="empty-block empty-state t-body" role="status">
      {message}
      <button className="empty-action pressable" onClick={onRetry}>
        {retryLabel}
      </button>
    </div>
  );
}
