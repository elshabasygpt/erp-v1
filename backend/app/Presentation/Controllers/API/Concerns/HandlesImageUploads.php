<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Concerns;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

trait HandlesImageUploads
{
    protected function storeUploadedImage(UploadedFile $file, string $tenantId, string $type): string
    {
        $ext = $file->extension() ?: $file->getClientOriginalExtension() ?: 'jpg';
        $filename = time() . '_' . Str::random(20) . '.' . $ext;

        $relativeDir = "uploads/tenant_{$tenantId}/{$type}";
        $destDir = public_path($relativeDir);

        if (! is_dir($destDir)) {
            mkdir($destDir, 0755, true);
        }

        $file->move($destDir, $filename);

        return '/' . $relativeDir . '/' . $filename;
    }

    protected function deleteUploadedImage(?string $url): void
    {
        if (! $url || ! str_starts_with($url, '/uploads/')) {
            return;
        }
        $path = public_path(ltrim($url, '/'));
        if (is_file($path)) {
            @unlink($path);
        }
    }
}
