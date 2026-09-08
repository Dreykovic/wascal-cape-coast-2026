<?php

namespace App\Http\Controllers;

use App\Support\WascalSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

    // POST /api/admin/logout.
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

    // GET /api/session — session courante.
    public function session(): JsonResponse
    {
        return response()->json(['role' => WascalSession::role()]);
    }
}
