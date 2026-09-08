<?php

namespace App\Http\Controllers;

use App\Models\JourneyStage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Étapes du séjour (page /parcours). Lecture publique ; écriture réservée au super-admin
// (middleware `admin`, cf. routes/web.php).
class JourneyStageController extends Controller
{
    // GET /api/journey-stages — publique.
    public function index(): JsonResponse
    {
        $owners = collect(config('wascal.gallery_owners'))->keyBy('key');

        $stages = JourneyStage::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (JourneyStage $s) => [
                'id' => $s->id,
                'title' => $s->title,
                'tag' => $s->tag,
                'tagName' => $owners[$s->tag]['name'] ?? null,
                'tagColor' => $owners[$s->tag]['color'] ?? null,
                'date_label' => $s->date_label,
                'body' => $s->body,
            ]);

        return response()->json(['ok' => true, 'stages' => $stages]);
    }

    // POST /api/admin/journey-stages {title, tag, date_label, body}
    public function store(Request $request): JsonResponse
    {
        $title = mb_substr(trim((string) $request->input('title', '')), 0, 120);
        if (mb_strlen($title) < 2) {
            return response()->json(['ok' => false, 'error' => 'Titre requis.'], 400);
        }

        $stage = JourneyStage::create([
            'title' => $title,
            'tag' => $this->validTagOrNull($request->input('tag')),
            'date_label' => $this->cleanShort($request->input('date_label')),
            'body' => $this->cleanBody($request->input('body')),
            'sort_order' => (int) (JourneyStage::max('sort_order') ?? -1) + 1,
        ]);

        return response()->json(['ok' => true, 'id' => $stage->id], 201);
    }

    // PATCH /api/admin/journey-stages/{id} {title, tag, date_label, body}
    public function update(Request $request, string $id): JsonResponse
    {
        $stage = JourneyStage::find((int) $id);
        if (! $stage) {
            return response()->json(['ok' => false, 'error' => 'Étape introuvable.'], 404);
        }

        $title = mb_substr(trim((string) $request->input('title', '')), 0, 120);
        if (mb_strlen($title) < 2) {
            return response()->json(['ok' => false, 'error' => 'Titre requis.'], 400);
        }

        $stage->update([
            'title' => $title,
            'tag' => $this->validTagOrNull($request->input('tag')),
            'date_label' => $this->cleanShort($request->input('date_label')),
            'body' => $this->cleanBody($request->input('body')),
        ]);

        return response()->json(['ok' => true]);
    }

    // DELETE /api/admin/journey-stages/{id}
    public function destroy(string $id): JsonResponse
    {
        $stage = JourneyStage::find((int) $id);
        if (! $stage) {
            return response()->json(['ok' => false, 'error' => 'Étape introuvable.'], 404);
        }
        $stage->delete();

        return response()->json(['ok' => true]);
    }

    // POST /api/admin/journey-stages/reorder {ids: [3,1,2,...]} — ordre = ordre du tableau.
    public function reorder(Request $request): JsonResponse
    {
        $ids = array_map('intval', is_array($request->input('ids')) ? $request->input('ids') : []);
        foreach ($ids as $i => $id) {
            JourneyStage::whereKey($id)->update(['sort_order' => $i]);
        }

        return response()->json(['ok' => true]);
    }

    private function validTagOrNull($tag): ?string
    {
        $tag = (string) $tag;
        $keys = array_column(config('wascal.gallery_owners'), 'key');

        return in_array($tag, $keys, true) ? $tag : null;
    }

    private function cleanShort($v): ?string
    {
        if ($v === null || $v === '') {
            return null;
        }

        return mb_substr((string) $v, 0, 80);
    }

    private function cleanBody($v): ?string
    {
        if ($v === null || $v === '') {
            return null;
        }

        return mb_substr((string) $v, 0, 4000);
    }
}
