"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="loading-screen">
      <div className="loading-card">
        <p className="eyebrow">Something broke</p>
        <h1>The workspace hit an unexpected error.</h1>
        <p>{error.message}</p>
        <button className="primary-button" onClick={() => reset()} type="button">
          Try again
        </button>
      </div>
    </main>
  );
}
