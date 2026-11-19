import Link from "next/link";

export default function NotFound() {
  return (
    <div className="state-panel">
      <h1>Not found</h1>
      <p className="state-message">
        We couldn&apos;t find that page. The order may have been removed, or
        the link is out of date.
      </p>
      <div className="form-actions center">
        <Link href="/orders" className="btn btn-primary">
          Go to orders
        </Link>
        <Link href="/" className="btn">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
