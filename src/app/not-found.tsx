import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="mt-4 text-ink-muted">
        We could not find that page.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-brand px-6 py-2.5 font-bold text-white transition hover:brightness-110"
      >
        Back to library
      </Link>
    </div>
  );
}
