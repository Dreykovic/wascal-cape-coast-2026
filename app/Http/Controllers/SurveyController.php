<?php

namespace App\Http\Controllers;

use App\Models\Response as SurveyResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SurveyController extends Controller
{
    // POST /api/responses — dépôt d'une réponse au sondage. Public.
    // Validation côté serveur (source de confiance), miroir de server.js.
    public function store(Request $request): JsonResponse
    {
        $b = $request->all();
        $errors = [];

        $fullName = trim((string) ($b['full_name'] ?? ''));
        if (mb_strlen($fullName) < 2) {
            $errors[] = 'Nom complet requis.';
        }

        $delegation = trim((string) ($b['delegation'] ?? ''));
        if (! in_array($delegation, config('wascal.delegations'), true)) {
            $errors[] = 'Délégation invalide.';
        }

        $floor = isset($b['floor']) ? (string) $b['floor'] : null;
        if ($floor && ! in_array($floor, config('wascal.floors'), true)) {
            $errors[] = 'Étage invalide.';
        }

        $englishLevel = isset($b['english_level']) ? (string) $b['english_level'] : null;
        if ($englishLevel && ! in_array($englishLevel, config('wascal.english_levels'), true)) {
            $errors[] = "Niveau d'anglais invalide.";
        }

        if ($errors) {
            return response()->json(['ok' => false, 'errors' => $errors], 400);
        }

        // Idées proposées librement : nettoyage, borne 80 car., dédup insensible à la casse, max 20.
        $proposed = [];
        $seen = [];
        foreach (is_array($b['proposed_activities'] ?? null) ? $b['proposed_activities'] : [] as $raw) {
            $s = mb_substr(trim((string) $raw), 0, 80);
            $key = mb_strtolower($s);
            if ($s === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $proposed[] = $s;
            if (count($proposed) >= 20) {
                break;
            }
        }

        $response = SurveyResponse::create([
            'full_name' => $fullName,
            'delegation' => $delegation,
            'floor' => $floor,
            'activities' => array_map('strval', is_array($b['activities'] ?? null) ? $b['activities'] : []),
            'proposed_activities' => $proposed,
            'talents' => array_map('strval', is_array($b['talents'] ?? null) ? $b['talents'] : []),
            'english_level' => $englishLevel,
            'dietary' => isset($b['dietary']) ? mb_substr((string) $b['dietary'], 0, 2000) : null,
            'notes' => isset($b['notes']) ? mb_substr((string) $b['notes'], 0, 4000) : null,
        ]);

        return response()->json(['ok' => true, 'id' => $response->id], 201);
    }
}
