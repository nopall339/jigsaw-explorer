import { buildPiecePath, segmentsToSvgPath } from '@/lib/puzzle-engine/jigsawPath';
import { generatePieces } from '@/lib/puzzle-engine/generatePieces';
import { createPuzzleLayout } from '@/lib/puzzle-engine/layout';
import { createRng } from '@/lib/puzzle-engine/rng';
import type { GalleryImage } from '@/types';

/**
 * Pratinjau hero: dirender di server sebagai SVG murni (nol JavaScript di client)
 * memakai *engine yang sama* dengan papan permainan — jadi bentuk potongan di
 * landing page memang bentuk potongan yang akan dimainkan.
 */
export function JigsawPreview({
  image,
  pieceCount = 12,
  seed = 20260811,
  className,
}: {
  image: GalleryImage;
  pieceCount?: number;
  seed?: number;
  className?: string;
}) {
  const layout = createPuzzleLayout(image.width, image.height, pieceCount);
  const pieces = generatePieces({ layout, seed });
  const { board, tabSize, padding } = layout;
  const rng = createRng(seed);

  // Beberapa potongan digeser sedikit supaya terlihat "sedang dikerjakan".
  const loose = new Set([
    pieces[1]?.id,
    pieces[pieces.length - 2]?.id,
    pieces[Math.floor(pieces.length / 2)]?.id,
  ]);

  return (
    <svg
      viewBox={`${-padding} ${-padding} ${board.width + padding * 2} ${board.height + padding * 2}`}
      className={className}
      role="img"
      aria-label={`Contoh puzzle: ${image.title}`}
    >
      <defs>
        {pieces.map((piece) => (
          <clipPath id={`preview-clip-${piece.id}`} key={piece.id}>
            <path
              d={segmentsToSvgPath(
                buildPiecePath({
                  edges: piece.edges,
                  width: piece.width,
                  height: piece.height,
                  tabSize,
                  originX: piece.correctX - board.x,
                  originY: piece.correctY - board.y,
                }),
              )}
            />
          </clipPath>
        ))}
      </defs>

      {/* bayangan lubang papan */}
      <rect
        x={0}
        y={0}
        width={board.width}
        height={board.height}
        rx={tabSize * 0.5}
        fill="#0b0f17"
        opacity="0.55"
      />

      {pieces.map((piece) => {
        const isLoose = loose.has(piece.id);
        const dx = isLoose ? rng.range(-1, 1) * piece.width * 0.42 : 0;
        const dy = isLoose ? rng.range(-1, 1) * piece.height * 0.34 : 0;
        const rotate = isLoose ? rng.range(-9, 9) : 0;
        const cx = piece.correctX - board.x + piece.width / 2;
        const cy = piece.correctY - board.y + piece.height / 2;

        return (
          <g
            key={piece.id}
            transform={`translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${rotate.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)})`}
            opacity={isLoose ? 0.97 : 1}
          >
            <g clipPath={`url(#preview-clip-${piece.id})`}>
              <image
                href={image.url}
                x={0}
                y={0}
                width={board.width}
                height={board.height}
                preserveAspectRatio="none"
              />
              {isLoose ? (
                <rect x={0} y={0} width={board.width} height={board.height} fill="#f0a44a" opacity="0.14" />
              ) : null}
            </g>
            <path
              d={segmentsToSvgPath(
                buildPiecePath({
                  edges: piece.edges,
                  width: piece.width,
                  height: piece.height,
                  tabSize,
                  originX: piece.correctX - board.x,
                  originY: piece.correctY - board.y,
                }),
              )}
              fill="none"
              stroke={isLoose ? '#f7c98b' : '#0b0f17'}
              strokeOpacity={isLoose ? 0.9 : 0.35}
              strokeWidth={isLoose ? 2.5 : 1.5}
            />
          </g>
        );
      })}
    </svg>
  );
}
