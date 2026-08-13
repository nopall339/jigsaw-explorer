import Link from 'next/link';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { JigsawPreview } from '@/components/marketing/JigsawPreview';
import { ButtonLink } from '@/components/ui/Button';
import { DEFAULT_GALLERY_IMAGE, GALLERY_CATEGORIES, GALLERY_IMAGES } from '@/lib/gallery';
import { PIECE_COUNT_OPTIONS } from '@/types';

const STEPS = [
  {
    title: 'Pilih gambar',
    body: 'Ambil dari galeri bawaan atau upload foto sendiri (JPG/PNG/WebP, maks 10MB).',
  },
  {
    title: 'Atur kesulitan',
    body: `Dari ${PIECE_COUNT_OPTIONS[0]} sampai ${PIECE_COUNT_OPTIONS[PIECE_COUNT_OPTIONS.length - 1]} potongan. Grid dihitung otomatis dari rasio gambar.`,
  },
  {
    title: 'Bagikan link',
    body: 'Setiap puzzle punya link room sendiri. Kirim ke teman — tanpa daftar, tanpa login.',
  },
  {
    title: 'Kerjakan bareng',
    body: 'Pergerakan potongan tersinkron real-time. Nyalakan video call di samping, seperti satu meja.',
  },
];

const FEATURES = [
  {
    title: 'Potongan jigsaw asli',
    body: 'Tab dan blank yang benar-benar saling mengunci, bukan kotak-kotak biasa. Bentuknya bervariasi tiap sisi.',
  },
  {
    title: 'Snap otomatis',
    body: 'Dekatkan potongan ke tempatnya, sisanya diurus aplikasi. Toleransi jaraknya menyesuaikan ukuran potongan.',
  },
  {
    title: 'Zoom & geser bebas',
    body: 'Scroll untuk zoom, drag area kosong untuk menggeser. Nyaman dipakai bahkan di layar laptop kecil.',
  },
  {
    title: 'Anti tarik-menarik',
    body: 'Potongan yang sedang dipegang pemain lain otomatis terkunci, jadi tidak ada tarik-menarik.',
  },
  {
    title: 'Cursor & nama pemain',
    body: 'Kamu bisa lihat siapa sedang mengerjakan bagian mana, lengkap dengan warna masing-masing.',
  },
  {
    title: 'Ramah video call',
    body: 'Semua kontrol ditempatkan di bawah, area atas dibiarkan lapang supaya tidak tertutup window PiP.',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* ------------------------------------------------------------- hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 h-[34rem] w-[64rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
          />

          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div className="animate-fade-in">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                Gratis · tanpa akun · langsung main
              </span>

              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-50 sm:text-5xl">
                Satu puzzle,
                <br />
                <span className="text-accent">dikerjakan bareng</span>
                <br />
                dari mana saja.
              </h1>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">
                Jigsaw Explorer adalah puzzle jigsaw digital yang bisa dikerjakan berdua atau
                bertujuh secara real-time. Nyalakan video call favoritmu di sebelah, lalu susun
                potongannya bersama — persis seperti mengerjakan puzzle di satu meja.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/create" size="lg">
                  Mulai Puzzle Baru
                </ButtonLink>
                <ButtonLink href="/create?mode=teman" size="lg" variant="secondary">
                  Main dengan Teman
                </ButtonLink>
              </div>

              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-white/5 pt-6">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Potongan</dt>
                  <dd className="mt-1 text-xl font-semibold text-slate-100">12–500</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Galeri</dt>
                  <dd className="mt-1 text-xl font-semibold text-slate-100">
                    {GALLERY_IMAGES.length} gambar
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Pemain</dt>
                  <dd className="mt-1 text-xl font-semibold text-slate-100">Sampai 8</dd>
                </div>
              </dl>
            </div>

            <div className="relative animate-fade-in">
              <div className="rounded-3xl border border-white/10 bg-board-900/60 p-4 shadow-2xl sm:p-6">
                <JigsawPreview
                  image={DEFAULT_GALLERY_IMAGE}
                  pieceCount={12}
                  className="w-full drop-shadow-2xl"
                />
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span>{DEFAULT_GALLERY_IMAGE.title}</span>
                  <span className="tabular-nums">9 / 12 terpasang</span>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-white/10 bg-board-800/90 px-3 py-2 text-xs shadow-lg backdrop-blur sm:block">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-mint" />
                <span className="text-slate-300">Rusa Jeli memegang 1 potongan</span>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- cara kerja */}
        <section id="cara-kerja" className="scroll-mt-20 border-t border-white/5 bg-board-900/30 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              Cara kerjanya
            </h2>
            <p className="mt-2 max-w-2xl text-slate-400">
              Empat langkah, tidak ada instalasi dan tidak ada pendaftaran.
            </p>

            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="relative rounded-2xl border border-white/10 bg-board-800/50 p-5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 font-semibold text-accent">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-100">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ----------------------------------------------------------- fitur */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              Yang sudah bisa dipakai
            </h2>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/10 bg-board-800/40 p-5 transition-colors hover:border-accent/30"
                >
                  <h3 className="font-semibold text-slate-100">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- galeri */}
        <section className="border-t border-white/5 bg-board-900/30 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
                  Galeri bawaan
                </h2>
                <p className="mt-2 text-slate-400">
                  {GALLERY_CATEGORIES.join(' · ')} — atau pakai fotomu sendiri.
                </p>
              </div>
              <Link
                href="/create"
                className="text-sm font-medium text-accent transition-colors hover:text-accent-soft"
              >
                Lihat semua →
              </Link>
            </div>

            <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {GALLERY_IMAGES.slice(0, 5).map((image) => (
                <li key={image.id}>
                  <Link
                    href={`/create?image=${encodeURIComponent(image.id)}`}
                    className="group block overflow-hidden rounded-xl border border-white/10 transition-colors hover:border-accent/40"
                  >
                    <span className="block aspect-[4/3] overflow-hidden bg-board-800">
                      <img
                        src={image.url}
                        alt={image.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </span>
                    <span className="block px-3 py-2">
                      <span className="block truncate text-sm font-medium text-slate-200">
                        {image.title}
                      </span>
                      <span className="block text-xs text-slate-500">{image.category}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------------- CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              Siap menyusun bareng?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Buat puzzle, kirim linknya ke teman, lalu mulai. Kalau mau sendiri dulu juga bisa —
              link-nya tetap ada kalau nanti berubah pikiran.
            </p>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/create" size="lg">
                Buat puzzle sekarang
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
