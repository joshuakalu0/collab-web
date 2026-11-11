import Link from "next/link";

export default function NotFound() {
  return (
    <main className="loading-screen">
      <div className="loading-card">
        <p className="eyebrow">Not found</p>
        <h1>That document does not exist or you do not have access.</h1>
        <p>Head back to the dashboard to open a document you own or one that has been shared with you.</p>
        <Link className="primary-button link-button" href="/">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
