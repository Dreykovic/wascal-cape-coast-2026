<?php

namespace App\Http\Controllers;

use App\Models\Response as SurveyResponse;
use App\Models\Setting;
use App\Support\Sanitize;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

    // GET /api/admin/export.csv — export point-virgule + BOM (Excel), tableaux joints par " | ".
    public function exportCsv(): HttpResponse
    {
        $rows = SurveyResponse::query()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        $cols = ['id', 'created_at', 'full_name', 'delegation', 'floor',
            'activities', 'proposed_activities', 'talents', 'english_level', 'dietary', 'notes'];

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

    // POST /api/admin/survey/toggle {open: bool} — ouvre/ferme le sondage aux nouvelles réponses.
    public function surveyToggle(Request $request): JsonResponse
    {
        Setting::write('survey_open', $request->boolean('open') ? '1' : '0');

        return response()->json(['ok' => true, 'open' => $request->boolean('open')]);
    }
}
