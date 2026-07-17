<?php

namespace App\Http\Middleware;

use App\Support\WascalSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Réservé au super-admin (répartition, réponses, codes, réglages globaux, export).
class RequireAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! WascalSession::isSuper()) {
            return response()->json(['ok' => false, 'error' => 'Non authentifié.'], 401);
        }

        return $next($request);
    }
}
