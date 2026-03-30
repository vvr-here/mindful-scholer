/**
 * SkeletonCard.jsx — Loading skeleton placeholders
 */
import React from "react";

export default function SkeletonCard({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" aria-hidden="true">
          <div className="skeleton-line wide" />
          <div className="skeleton-line medium" />
        </div>
      ))}
    </>
  );
}
