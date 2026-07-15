<?php

namespace App\Support;

// Photos de galerie : décodage des data-URL base64 envoyées par le navigateur (redimensionnées
// côté client via canvas) et écriture/suppression dans public/uploads. Aucune dépendance.
class GalleryImage
{
    public static function dir(): string
    {
        return config('wascal.uploads_path') ?: public_path('uploads');
    }

    // Décode une data-URL image → ['ext' => 'jpg'|'png'|'webp', 'data' => binaire] ou null si invalide.
    public static function parseDataUrl($dataUrl): ?array
    {
        if (! preg_match('#^data:image/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$#', (string) $dataUrl, $m)) {
            return null;
        }

        $raw = strtolower($m[1]);
        $ext = ($raw === 'jpeg' || $raw === 'jpg') ? 'jpg' : $raw;
        $data = base64_decode(preg_replace('/\s+/', '', $m[2]), true);

        if ($data === false || strlen($data) === 0) {
            return null;
        }

        return ['ext' => $ext, 'data' => $data];
    }

    public static function save(string $filename, string $data): void
    {
        if (! is_dir(static::dir())) {
            mkdir(static::dir(), 0775, true);
        }
        file_put_contents(static::dir().DIRECTORY_SEPARATOR.$filename, $data);
    }

    public static function remove(string $filename): void
    {
        $base = str_replace(['/', '\\'], '', $filename); // pas de remontée de chemin
        $path = static::dir().DIRECTORY_SEPARATOR.$base;
        if (is_file($path)) {
            @unlink($path);
        }
    }
}
