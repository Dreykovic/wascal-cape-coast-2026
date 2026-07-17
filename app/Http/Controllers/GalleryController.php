<?php

namespace App\Http\Controllers;

use App\Models\GalleryAlbum;
use App\Models\GalleryCode;
use App\Models\GalleryPhoto;
use App\Models\Setting;
use App\Support\GalleryImage;
use App\Support\Sanitize;
use App\Support\WascalSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GalleryController extends Controller
{
    // GET /api/gallery — étagère d'albums + photos, lue par index.html. Publique.
    public function index(): JsonResponse
    {
        $owners = collect(config('wascal.gallery_owners'))->keyBy('key');

        $albums = GalleryAlbum::query()
            ->with('photos')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (GalleryAlbum $a) => [
                'id' => $a->id,
                'title' => $a->title,
                'color' => $a->color,
                'drive_url' => $a->drive_url ?? '',
                'owner' => $a->owner ?? '',
                'ownerName' => $owners[$a->owner]['name'] ?? '',
                'photos' => $a->photos->map(fn ($p) => [
                    'src' => 'uploads/'.$p->filename,
                    'cap' => $p->caption ?? '',
                ])->all(),
            ]);

        return response()->json([
            'ok' => true,
            'albums' => $albums,
            'drive_all' => Setting::read('drive_all', ''),
        ]);
    }

    // GET /api/gallery/manage — gestion (super = tout ; comité = ses albums). Middleware `gallery`.
    public function manage(): JsonResponse
    {
        $ownersCfg = config('wascal.gallery_owners');
        $ownersByKey = collect($ownersCfg)->keyBy('key');
        $isSuper = WascalSession::isSuper();
        $myOwner = WascalSession::owner();

        $query = GalleryAlbum::query()->with('photos')->orderBy('sort_order')->orderBy('id');
        if (! $isSuper) {
            $query->where('owner', $myOwner);
        }

        $albums = $query->get()->map(fn (GalleryAlbum $a) => [
            'id' => $a->id,
            'title' => $a->title,
            'color' => $a->color,
            'drive_url' => $a->drive_url ?? '',
            'owner' => $a->owner ?? '',
            'ownerName' => $ownersByKey[$a->owner]['name'] ?? '',
            'photos' => $a->photos->map(fn ($p) => [
                'id' => $p->id,
                'src' => 'uploads/'.$p->filename,
                'cap' => $p->caption ?? '',
            ])->all(),
        ])->all();

        $out = ['ok' => true, 'role' => WascalSession::role(), 'owners' => $ownersCfg, 'albums' => $albums];

        if ($isSuper) {
            $codesByOwner = GalleryCode::all()->keyBy('owner');
            $out['drive_all'] = Setting::read('drive_all', '');
            $out['codes'] = array_map(fn ($o) => [
                'owner' => $o['key'],
                'set' => (bool) ($codesByOwner[$o['key']]->code_hash ?? null),
                'updated_at' => $codesByOwner[$o['key']]->updated_at ?? null,
            ], $ownersCfg);
        } else {
            $out['owner'] = $ownersByKey[$myOwner] ?? null;
        }

        return response()->json($out);
    }

    // POST /api/gallery/album {title, color, drive_url, [owner]}
    public function storeAlbum(Request $request): JsonResponse
    {
        $title = mb_substr(trim((string) $request->input('title', '')), 0, 80);
        if (mb_strlen($title) < 2) {
            return response()->json(['ok' => false, 'error' => 'Titre requis.'], 400);
        }

        // Un comité crée dans SA galerie ; le super-admin choisit (ou null).
        $owner = WascalSession::isSuper()
            ? $this->validOwnerOrNull($request->input('owner'))
            : WascalSession::owner();

        $album = GalleryAlbum::create([
            'title' => $title,
            'color' => Sanitize::color($request->input('color')),
            'drive_url' => Sanitize::url($request->input('drive_url')) ?: null,
            'owner' => $owner,
            'sort_order' => (int) (GalleryAlbum::max('sort_order') ?? -1) + 1,
        ]);

        return response()->json(['ok' => true, 'id' => $album->id], 201);
    }

    // PATCH /api/gallery/album/{id} {title, color, drive_url, [owner]}
    public function updateAlbum(Request $request, string $id): JsonResponse
    {
        $album = $this->findAlbumInScope($id, $error, $status);
        if (! $album) {
            return response()->json(['ok' => false, 'error' => $error], $status);
        }

        $title = mb_substr(trim((string) $request->input('title', '')), 0, 80);
        if (mb_strlen($title) < 2) {
            return response()->json(['ok' => false, 'error' => 'Titre requis.'], 400);
        }

        // Un comité ne peut pas changer le propriétaire ; le super-admin oui.
        $owner = WascalSession::isSuper()
            ? $this->validOwnerOrNull($request->input('owner'))
            : $album->owner;

        $album->update([
            'title' => $title,
            'color' => Sanitize::color($request->input('color')),
            'drive_url' => Sanitize::url($request->input('drive_url')) ?: null,
            'owner' => $owner,
        ]);

        return response()->json(['ok' => true]);
    }

    // DELETE /api/gallery/album/{id} — supprime l'album, ses photos et les fichiers sur disque.
    public function deleteAlbum(string $id): JsonResponse
    {
        $album = $this->findAlbumInScope($id, $error, $status);
        if (! $album) {
            return response()->json(['ok' => false, 'error' => $error], $status);
        }

        foreach ($album->photos as $photo) {
            GalleryImage::remove($photo->filename);
        }
        $album->photos()->delete();
        $album->delete();

        return response()->json(['ok' => true]);
    }

    // POST /api/gallery/photo {album_id, dataUrl, caption} — upload base64 -> public/uploads.
    public function storePhoto(Request $request): JsonResponse
    {
        $albumId = (int) $request->input('album_id');
        $album = GalleryAlbum::find($albumId);
        if (! $album) {
            return response()->json(['ok' => false, 'error' => 'Album invalide.'], 400);
        }
        if (WascalSession::outOfScope($album->owner)) {
            return response()->json(['ok' => false, 'error' => 'Hors de votre périmètre.'], 403);
        }

        $parsed = GalleryImage::parseDataUrl($request->input('dataUrl'));
        if (! $parsed) {
            return response()->json(['ok' => false, 'error' => 'Image invalide (JPEG/PNG/WebP attendu).'], 400);
        }
        if (strlen($parsed['data']) > 6 * 1024 * 1024) {
            return response()->json(['ok' => false, 'error' => 'Image trop lourde (max 6 Mo).'], 413);
        }

        $filename = 'g'.$albumId.'-'.bin2hex(random_bytes(6)).'.'.$parsed['ext'];
        GalleryImage::save($filename, $parsed['data']);

        $photo = GalleryPhoto::create([
            'album_id' => $albumId,
            'filename' => $filename,
            'caption' => $this->cleanCaption($request->input('caption')),
            'sort_order' => (int) (GalleryPhoto::where('album_id', $albumId)->max('sort_order') ?? -1) + 1,
        ]);

        return response()->json(['ok' => true, 'id' => $photo->id, 'src' => 'uploads/'.$filename], 201);
    }

    // PATCH /api/gallery/photo/{id} {caption}
    public function updatePhoto(Request $request, string $id): JsonResponse
    {
        $photo = $this->findPhotoInScope($id, $error, $status);
        if (! $photo) {
            return response()->json(['ok' => false, 'error' => $error], $status);
        }

        $photo->update(['caption' => $this->cleanCaption($request->input('caption'))]);

        return response()->json(['ok' => true]);
    }

    // DELETE /api/gallery/photo/{id} — supprime la photo et son fichier.
    public function deletePhoto(string $id): JsonResponse
    {
        $photo = $this->findPhotoInScope($id, $error, $status);
        if (! $photo) {
            return response()->json(['ok' => false, 'error' => $error], $status);
        }

        $filename = $photo->filename;
        $photo->delete();
        GalleryImage::remove($filename);

        return response()->json(['ok' => true]);
    }

    // --- Helpers ------------------------------------------------------------

    // Récupère un album en vérifiant id + existence + périmètre. Renseigne $error/$status si refus.
    private function findAlbumInScope(string $id, ?string &$error, ?int &$status): ?GalleryAlbum
    {
        $id = (int) $id;
        if ($id <= 0) {
            [$error, $status] = ['id invalide.', 400];

            return null;
        }
        $album = GalleryAlbum::with('photos')->find($id);
        if (! $album) {
            [$error, $status] = ['Album introuvable.', 404];

            return null;
        }
        if (WascalSession::outOfScope($album->owner)) {
            [$error, $status] = ['Hors de votre périmètre.', 403];

            return null;
        }

        return $album;
    }

    private function findPhotoInScope(string $id, ?string &$error, ?int &$status): ?GalleryPhoto
    {
        $id = (int) $id;
        if ($id <= 0) {
            [$error, $status] = ['id invalide.', 400];

            return null;
        }
        $photo = GalleryPhoto::with('album')->find($id);
        if (! $photo) {
            [$error, $status] = ['Photo introuvable.', 404];

            return null;
        }
        if (WascalSession::outOfScope($photo->album?->owner)) {
            [$error, $status] = ['Hors de votre périmètre.', 403];

            return null;
        }

        return $photo;
    }

    private function validOwnerOrNull($reqOwner): ?string
    {
        $reqOwner = (string) $reqOwner;
        $keys = array_column(config('wascal.gallery_owners'), 'key');

        return in_array($reqOwner, $keys, true) ? $reqOwner : null;
    }

    private function cleanCaption($caption): ?string
    {
        if ($caption === null || $caption === '') {
            return null;
        }

        return mb_substr((string) $caption, 0, 160);
    }
}
