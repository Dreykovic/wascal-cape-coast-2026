<?php

namespace App\Http\Controllers;

use App\Models\GalleryCode;
use App\Models\Response as SurveyResponse;
use App\Models\Setting;
use App\Support\Sanitize;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

// Endpoints réservés au super-admin (middleware `admin`).
class AdminController extends Controller
{
    // GET /api/admin/responses — toutes les réponses (la dédup se fait côté admin.html).
    public function responses(): JsonResponse
    {
        $responses = SurveyResponse::query()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return response()->json(['ok' => true, 'responses' => $responses]);
    }

    // POST /api/admin/assign {id, committee} — fixe (ou réinitialise) le comité d'une personne.
    public function assign(Request $request): JsonResponse
    {
        $id = (int) $request->input('id');
        $committee = $request->input('committee');

        if ($id <= 0) {
            return response()->json(['ok' => false, 'error' => 'id invalide.'], 400);
        }

        $committees = array_column(config('wascal.committees'), 'name');
        if ($committee !== null && $committee !== '' && ! in_array($committee, $committees, true)) {
            return response()->json(['ok' => false, 'error' => 'Comité invalide.'], 400);
        }

        $response = SurveyResponse::find($id);
        if (! $response) {
            return response()->json(['ok' => false, 'error' => 'Réponse introuvable.'], 404);
        }

        $response->assigned_committee = ($committee === null || $committee === '') ? null : (string) $committee;
        $response->save();

        return response()->json(['ok' => true]);
    }

    // GET /api/admin/export.csv — export point-virgule + BOM (Excel), tableaux joints par " | ".
    public function exportCsv(): HttpResponse
    {
        $rows = SurveyResponse::query()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        $cols = ['id', 'created_at', 'full_name', 'delegation', 'floor',
            'committee_rank', 'assigned_committee', 'activities', 'proposed_activities',
            'talents', 'english_level', 'dietary', 'notes'];

        $cell = function ($v): string {
            $s = is_array($v) ? implode(' | ', $v) : (string) ($v ?? '');

            return preg_match('/[",\n;]/', $s) ? '"'.str_replace('"', '""', $s).'"' : $s;
        };

        $lines = [implode(';', $cols)];
        foreach ($rows as $r) {
            $lines[] = implode(';', array_map(fn ($c) => $cell($r->$c), $cols));
        }

        $csv = "\u{FEFF}".implode("\r\n", $lines); // BOM pour Excel

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="wascal-responses.csv"',
        ]);
    }

    // POST /api/admin/gallery/settings {drive_all} — lien Drive global.
    public function gallerySettings(Request $request): JsonResponse
    {
        Setting::write('drive_all', Sanitize::url($request->input('drive_all')));

        return response()->json(['ok' => true]);
    }

    // POST /api/admin/gallery/code {owner} — (re)génère un code, renvoyé EN CLAIR une seule fois.
    public function generateCode(Request $request): JsonResponse
    {
        $owner = (string) $request->input('owner', '');
        if (! in_array($owner, $this->ownerKeys(), true)) {
            return response()->json(['ok' => false, 'error' => 'Comité invalide.'], 400);
        }

        $code = $this->genCode();
        GalleryCode::updateOrCreate(['owner' => $owner], ['code_hash' => Hash::make($code)]);

        return response()->json(['ok' => true, 'owner' => $owner, 'code' => $code]);
    }

    // DELETE /api/admin/gallery/code/{owner} — révoque le code (accès fermé jusqu'à régénération).
    public function revokeCode(string $owner): JsonResponse
    {
        if (! in_array($owner, $this->ownerKeys(), true)) {
            return response()->json(['ok' => false, 'error' => 'Comité invalide.'], 400);
        }

        GalleryCode::updateOrCreate(['owner' => $owner], ['code_hash' => null]);

        return response()->json(['ok' => true]);
    }

    private function ownerKeys(): array
    {
        return array_column(config('wascal.gallery_owners'), 'key');
    }

    // Code lisible à partager (8 caractères, sans 0/O/1/I ambigus).
    private function genCode(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $out = '';
        for ($i = 0; $i < 8; $i++) {
            $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $out;
    }
}
