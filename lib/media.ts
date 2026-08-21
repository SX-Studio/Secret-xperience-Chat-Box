import 'server-only';
import sharp from 'sharp';

// Derive the safe, feed-facing images from an uploaded master. The blurred preview is
// what the feed shows before a rental; the thumbnail is a small clear crop for cards
// (kept modest so it doesn't reveal the full content on its own).
export async function processImage(input: Buffer): Promise<{
  width: number | null;
  height: number | null;
  thumb: Buffer;
  blurred: Buffer;
}> {
  const meta = await sharp(input).metadata();
  const thumb = await sharp(input)
    .rotate()
    .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 72 })
    .toBuffer();
  const blurred = await sharp(input)
    .rotate()
    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    .blur(26)
    .modulate({ brightness: 0.92 })
    .jpeg({ quality: 45 })
    .toBuffer();
  return { width: meta.width ?? null, height: meta.height ?? null, thumb, blurred };
}
