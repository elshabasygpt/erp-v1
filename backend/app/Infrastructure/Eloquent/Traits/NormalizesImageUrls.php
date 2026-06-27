<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Traits;

use Illuminate\Support\Facades\Storage;

trait NormalizesImageUrls
{
    /**
     * Convert any absolute image URL to a relative path.
     * Works for both /uploads/* and /storage/* patterns.
     */
    public static function toRelativeUrl(?string $url): ?string
    {
        if (!$url) {
            return null;
        }
        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return parse_url($url, PHP_URL_PATH) ?: $url;
        }
        return $url;
    }

    /**
     * Delete the actual file from disk, handling both storage patterns:
     *  - /uploads/* → stored in public/ directory
     *  - /storage/* → stored via Storage::disk('public')
     * Accepts absolute or relative URLs.
     */
    public static function deleteImageFile(?string $url): void
    {
        if (!$url) {
            return;
        }
        $relative = self::toRelativeUrl($url);
        if (!$relative) {
            return;
        }

        if (str_starts_with($relative, '/storage/')) {
            $diskPath = substr($relative, strlen('/storage/'));
            Storage::disk('public')->delete($diskPath);
        } elseif (str_starts_with($relative, '/uploads/')) {
            @unlink(public_path(ltrim($relative, '/')));
        }
    }
}
