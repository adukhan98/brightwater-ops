"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";
  const digest =
    error instanceof Error && "digest" in error
      ? String((error as Error & { digest?: string }).digest ?? "")
      : "";

  return (
    <div className="state-panel">
      <h1>Something went wrong</h1>
      <p className="state-message">{message}</p>
      {digest && <p className="muted mono small">Reference: {digest}</p>}
      <div className="form-actions center">
        <button type="button" className="btn btn-primary" onClick={() => retry()}>
          Try again
        </button>
        <a href="/" className="btn">
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
