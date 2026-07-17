<?php

namespace App\Http\Controllers;

use App\Models\GalleryCode;
use App\Support\WascalSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // POST /api/admin/login — mot de passe unique (comparaison à temps constant).
    public function adminLogin(Request $request): JsonResponse
    {
        $password = (string) $request->input('password', '');

        if (! hash_equals((string) config('wascal.admin_password'), $password)) {
            return response()->json(['ok' => false, 'error' => 'Mot de passe incorrect.'], 401);
        }

        $request->session()->regenerate();
        WascalSession::loginSuper();

        return response()->json(['ok' => true]);
    }

    // POST /api/comite/login — connexion d'un comité avec son code partagé (haché en base).
    public function comiteLogin(Request $request): JsonResponse
    {
        $owner = (string) $request->input('owner', '');
        $code = (string) $request->input('code', '');

        if (! in_array($owner, $this->ownerKeys(), true)) {
            return response()->json(['ok' => false, 'error' => 'Comité invalide.'], 400);
        }

        $stored = GalleryCode::query()->whereKey($owner)->value('code_hash');
        if (! $stored) {
            return response()->json(['ok' => false, 'error' => "Aucun code défini pour ce comité — demande-le à l'admin."], 401);
        }
        if (! Hash::check($code, $stored)) {
            return response()->json(['ok' => false, 'error' => 'Code incorrect.'], 401);
        }

        $request->session()->regenerate();
        WascalSession::loginOwner($owner);

        return response()->json(['ok' => true, 'owner' => $owner]);
    }

    // POST /api/admin/logout et /api/comite/logout.
    public function logout(): JsonResponse
    {
        WascalSession::logout();

        return response()->json(['ok' => true]);
    }

    // GET /api/admin/me — l'admin est-il connecté ?
    public function me(): JsonResponse
    {
        return response()->json(['authed' => WascalSession::isSuper()]);
    }

    // GET /api/session — session courante (utilisée par /comite).
    public function session(): JsonResponse
    {
        $role = WascalSession::role();

        if ($role === 'super') {
            return response()->json(['role' => 'super']);
        }
        if ($role === 'owner') {
            $owner = collect(config('wascal.gallery_owners'))->firstWhere('key', WascalSession::owner());

            return response()->json(['role' => 'owner', 'owner' => $owner]);
        }

        return response()->json(['role' => null]);
    }

    private function ownerKeys(): array
    {
        return array_column(config('wascal.gallery_owners'), 'key');
    }
}
