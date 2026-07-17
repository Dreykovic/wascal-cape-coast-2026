<?php

namespace App\Http\Middleware;

use App\Support\WascalSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Super-admin OU comité connecté. Le contrôle de périmètre (album d'un autre comité)
// se fait dans le contrôleur via WascalSession::outOfScope().
class RequireGallery
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! WascalSession::isAuthed()) {
            return response()->json(['ok' => false, 'error' => 'Non authentifié.'], 401);
        }

        return $next($request);
    }
}
