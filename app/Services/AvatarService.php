<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Throwable;

class AvatarService
{
    /**
     * Convert an uploaded image into an optimized square WebP data URI.
     */
    public function toDataUri(UploadedFile|string $file, int $maxDimension = 256, int $quality = 82): string
    {
        $rawBytes = $file instanceof UploadedFile
            ? $file->get()
            : (is_file($file) ? file_get_contents($file) : $file);

        if (! is_string($rawBytes) || $rawBytes === '') {
            throw new \InvalidArgumentException('Empty or invalid image data provided.');
        }

        try {
            $src = @imagecreatefromstring($rawBytes);

            if ($src !== false) {
                $width = imagesx($src);
                $height = imagesy($src);

                // Determine square crop from center
                $cropSize = min($width, $height);
                $cropX = (int) max(0, ($width - $cropSize) / 2);
                $cropY = (int) max(0, ($height - $cropSize) / 2);

                $targetSize = min($maxDimension, $cropSize);
                $dst = imagecreatetruecolor($targetSize, $targetSize);

                // Preserve alpha channel for PNG/WebP transparency
                imagealphablending($dst, false);
                imagesavealpha($dst, true);
                $transparent = imagecolorallocatealpha($dst, 255, 255, 255, 127);
                imagefilledrectangle($dst, 0, 0, $targetSize, $targetSize, $transparent);

                imagecopyresampled(
                    $dst,
                    $src,
                    0,
                    0,
                    $cropX,
                    $cropY,
                    $targetSize,
                    $targetSize,
                    $cropSize,
                    $cropSize
                );

                ob_start();
                if (function_exists('imagewebp')) {
                    imagewebp($dst, null, $quality);
                    $mime = 'image/webp';
                } else {
                    imagejpeg($dst, null, $quality);
                    $mime = 'image/jpeg';
                }
                $compressed = ob_get_clean();

                imagedestroy($src);
                imagedestroy($dst);

                if (is_string($compressed) && $compressed !== '') {
                    return 'data:'.$mime.';base64,'.base64_encode($compressed);
                }
            }
        } catch (Throwable) {
            // Fall back to direct raw base64 if GD fails
        }

        $detectedMime = $file instanceof UploadedFile ? $file->getMimeType() : 'image/jpeg';

        return 'data:'.($detectedMime ?? 'image/jpeg').';base64,'.base64_encode($rawBytes);
    }

    /**
     * Resolve the public URL or data URI for an avatar safely.
     */
    public function url(?string $avatar): ?string
    {
        if (! is_string($avatar) || trim($avatar) === '') {
            return null;
        }

        $avatar = trim($avatar);

        // Inline base64 data URI
        if (str_starts_with($avatar, 'data:')) {
            return $avatar;
        }

        // Full remote URL
        if (str_starts_with($avatar, 'http://') || str_starts_with($avatar, 'https://')) {
            return $avatar;
        }

        // Legacy local storage file
        return '/storage/'.ltrim($avatar, '/');
    }
}
