import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-12) 0", textAlign: "center" }}>
      <h2 style={{ fontFamily: "var(--font-serif, Georgia, serif)", fontSize: "32px", color: "var(--slate)", marginBottom: "var(--space-4)" }}>
        404
      </h2>
      <p style={{ fontFamily: "var(--font-sans, ui-sans-serif, sans-serif)", fontSize: "15px", color: "var(--g500)", marginBottom: "var(--space-8)", maxWidth: "380px" }}>
        This page doesn&apos;t exist or has moved.
      </p>
      <Link href="/" className="btn-primary">
        Return Home
      </Link>
    </div>
  );
}
