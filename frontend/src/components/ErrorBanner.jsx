/**
 * ErrorBanner.jsx — Inline error state with retry button
 */
import React from "react";

export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="error-banner" role="alert">
      <span className="material-symbols-rounded error-icon">error</span>
      <p className="error-msg">{message || "Something went wrong."}</p>
      {onRetry && (
        <button className="btn-ghost small" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
