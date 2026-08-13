import Link from 'next/link';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
        <rect
          x="1.5"
          y="1.5"
          width="29"
          height="29"
          rx="7"
          fill="#1a2233"
          stroke="#f0a44a"
          strokeWidth="2"
        />
        <path
          d="M8 12.5c0-1.4 1.1-2.5 2.5-2.5h2.2c.5 0 .8-.5.6-1a2.2 2.2 0 0 1 4.1 0c-.2.5.1 1 .6 1h2.2c1.4 0 2.5 1.1 2.5 2.5V15c0 .6-.6.9-1.1.6a2.2 2.2 0 0 0 0 3.8c.5-.3 1.1 0 1.1.6v2.5c0 1.4-1.1 2.5-2.5 2.5h-10A2.5 2.5 0 0 1 8 22.5V12.5Z"
          fill="#f0a44a"
        />
      </svg>
    </span>
  );
}

export default function Navbar() {
  return (
    <header className="border-b border-white/5">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Logo />
          <span className="text-base font-semibold tracking-tight text-slate-100">
            Jigsaw <span className="text-accent">Explorer</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 text-sm">
          <Link
            href="/#cara-kerja"
            className="rounded-lg px-3 py-2 text-slate-300 transition-colors hover:bg-white/5 hover:text-slate-100"
          >
            Cara kerja
          </Link>
          <Link
            href="/create"
            className="rounded-lg px-3 py-2 font-medium text-accent transition-colors hover:bg-accent/10"
          >
            Mulai puzzle
          </Link>
        </div>
      </nav>
    </header>
  );
}
