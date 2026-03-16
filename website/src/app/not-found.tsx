import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-4xl font-bold mb-4 font-sans uppercase tracking-tight">404 - Page Not Found</h2>
      <p className="text-lg text-slate-700 font-serif italic mb-8 max-w-md">
        The page you are looking for does not exist or has been moved to a different location.
      </p>
      <Link 
        href="/" 
        className="lwn-btn no-underline px-6 py-2"
      >
        Return Home
      </Link>
    </div>
  );
}
