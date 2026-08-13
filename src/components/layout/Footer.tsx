export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-sm text-slate-500 sm:flex-row sm:justify-between sm:px-6 sm:text-left">
        <p>Jigsaw Explorer — gratis, tanpa akun, langsung main di browser.</p>
        <p className="text-xs">
          Room aktif disimpan di memori server, jadi restart server = room hilang.
        </p>
      </div>
    </footer>
  );
}
