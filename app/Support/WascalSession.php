<?php

namespace App\Support;

// Rôle porté par la session Laravel (équivalent du cookie signé de l'app Node).
// Un seul rôle depuis le retrait des comités : 'super' = super-admin, qui voit/édite tout
// (galerie, étapes du parcours, réponses au sondage). Pas de compte scopé par comité.
class WascalSession
{
    public static function role(): ?string
    {
        return session('wascal_role');
    }

    public static function isSuper(): bool
    {
        return static::role() === 'super';
    }

    public static function isAuthed(): bool
    {
        return static::isSuper();
    }

    public static function loginSuper(): void
    {
        session(['wascal_role' => 'super']);
    }

    public static function logout(): void
    {
        session()->forget('wascal_role');
    }
}
