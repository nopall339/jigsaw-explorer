'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { GALLERY_IMAGES, GALLERY_CATEGORIES, galleryByCategory } from '@/lib/gallery';
import { PIECE_COUNT_OPTIONS, type PieceCountOption, type CreateRoomRequest } from '@/types';
import { cn } from '@/lib/utils';

export default function CreatePage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [pieceCount, setPieceCount] = useState<PieceCountOption>(100);
  const [allowRotation, setAllowRotation] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const displayImages = galleryByCategory(selectedCategory);
  const selectedImage = GALLERY_IMAGES.find((img) => img.url === selectedImageUrl);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 10MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload gagal');
      }

      const data = await response.json();
      setSelectedImageUrl(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload gagal');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedImageUrl) return;

    setIsCreating(true);

    try {
      const image = selectedImage || {
        width: 1920,
        height: 1080,
        title: 'Puzzle Custom',
      };

      const payload: CreateRoomRequest = {
        imageUrl: selectedImageUrl,
        imageWidth: image.width,
        imageHeight: image.height,
        imageTitle: image.title,
        imageSource: selectedImage ? 'gallery' : 'upload',
        pieceCount,
        allowRotation,
      };

      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal membuat room');
      }

      const data = await response.json();
      router.push(`/room/${data.room.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal membuat room');
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-50">Buat Puzzle Baru</h1>
            <p className="mt-2 text-slate-400">
              Pilih gambar dari galeri atau upload fotomu sendiri, lalu atur kesulitan.
            </p>
          </div>

          {/* Step 1: Pilih Gambar */}
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-slate-100">1. Pilih Gambar</h2>

            {/* Upload */}
            <div className="mb-6 rounded-xl border border-dashed border-white/20 bg-board-800/40 p-6">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Upload foto sendiri
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUpload}
                  disabled={isUploading}
                  className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-board-950 hover:file:bg-accent-soft disabled:opacity-50"
                />
                <span className="mt-1 block text-xs text-slate-500">
                  PNG, JPEG, atau WebP · Maksimal 10MB
                </span>
              </label>
              {isUploading && (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                  <Spinner className="h-4 w-4" />
                  Mengupload...
                </div>
              )}
              {uploadError && <p className="mt-2 text-sm text-rose-400">{uploadError}</p>}
            </div>

            {/* Kategori Filter */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  selectedCategory === null
                    ? 'bg-accent text-board-950'
                    : 'bg-board-700 text-slate-300 hover:bg-board-600',
                )}
              >
                Semua
              </button>
              {GALLERY_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    selectedCategory === category
                      ? 'bg-accent text-board-950'
                      : 'bg-board-700 text-slate-300 hover:bg-board-600',
                  )}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Galeri */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {displayImages.map((image) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImageUrl(image.url)}
                  className={cn(
                    'group relative overflow-hidden rounded-xl border transition-all',
                    selectedImageUrl === image.url
                      ? 'border-accent ring-2 ring-accent/50'
                      : 'border-white/10 hover:border-accent/40',
                  )}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-board-800">
                    <img
                      src={image.url}
                      alt={image.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-slate-200">{image.title}</p>
                  </div>
                  {selectedImageUrl === image.url && (
                    <div className="absolute right-2 top-2 rounded-full bg-accent p-1">
                      <svg className="h-4 w-4 text-board-950" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Step 2: Kesulitan */}
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-slate-100">2. Atur Kesulitan</h2>

            <div className="space-y-6 rounded-xl border border-white/10 bg-board-800/40 p-6">
              {/* Jumlah Potongan */}
              <div>
                <label className="mb-3 block text-sm font-medium text-slate-300">
                  Jumlah potongan
                </label>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {PIECE_COUNT_OPTIONS.map((count) => (
                    <button
                      key={count}
                      onClick={() => setPieceCount(count)}
                      className={cn(
                        'rounded-lg py-3 text-center font-semibold transition-all',
                        pieceCount === count
                          ? 'bg-accent text-board-950 shadow-lg shadow-accent/20'
                          : 'bg-board-700 text-slate-200 hover:bg-board-600',
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rotasi */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-200">Izinkan rotasi potongan</p>
                  <p className="text-sm text-slate-500">
                    Potongan bisa diputar — lebih menantang!
                  </p>
                </div>
                <button
                  onClick={() => setAllowRotation(!allowRotation)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    allowRotation ? 'bg-accent' : 'bg-board-600',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      allowRotation ? 'translate-x-6' : 'translate-x-1',
                    )}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Action */}
          <div className="flex justify-end gap-4">
            <Button variant="secondary" onClick={() => router.push('/')}>
              Batal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedImageUrl || isCreating}
              size="lg"
            >
              {isCreating ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Membuat room...
                </>
              ) : (
                'Mulai Puzzle'
              )}
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
