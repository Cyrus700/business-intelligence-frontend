export default function SocialButtons() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white text-sm font-medium text-ink transition-colors hover:bg-bg-soft"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path fill="#EA4335" d="M12 11v3.8h5.3c-.2 1.4-1.6 4-5.3 4-3.2 0-5.8-2.6-5.8-5.8S8.8 7.2 12 7.2c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.6 4.7 14.5 4 12 4 7.6 4 4 7.6 4 12s3.6 8 8 8c4.6 0 7.7-3.2 7.7-7.8 0-.5 0-.9-.1-1.2H12z" />
          </svg>
          Google
        </button>
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white text-sm font-medium text-ink transition-colors hover:bg-bg-soft"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M16.4 1.6H7.6A6 6 0 0 0 1.6 7.6v8.8a6 6 0 0 0 6 6h8.8a6 6 0 0 0 6-6V7.6a6 6 0 0 0-6-6zM12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6zm5-1.6a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z" />
          </svg>
          GitHub
        </button>
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-ink-muted">
        <span className="h-px flex-1 bg-border" />
        or continue with email
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
