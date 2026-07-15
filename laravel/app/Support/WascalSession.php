<?php

namespace App\Support;

// Deux rôles portés par la session Laravel (équivalent du cookie signé de l'app Node) :
//   'super' = super-admin (toi)          -> voit/édite tout
//   'owner' = un comité connecté par code -> scopé à SA galerie (clé dans wascal_owner)
class WascalSession
{
    public static function role(): ?string
    {
        return session('wascal_role');
    }

    public static function owner(): ?string
    {
        return session('wascal_owner');
    }

    public static function isSuper(): bool
    {
        return static::role() === 'super';
    }

    public static function isAuthed(): bool
    {
        return in_array(static::role(), ['super', 'owner'], true);
    }

    // Un comité ne peut toucher qu'à ses propres albums ; le super-admin n'est jamais bloqué.
    public static function outOfScope(?string $owner): bool
    {
        return static::role() === 'owner' && $owner !== static::owner();
    }

    public static function loginSuper(): void
    {
        session(['wascal_role' => 'super']);
        session()->forget('wascal_owner');
    }

    public static function loginOwner(string $ownerKey): void
    {
        session(['wascal_role' => 'owner', 'wascal_owner' => $ownerKey]);
    }

    public static function logout(): void
    {
        session()->forget(['wascal_role', 'wascal_owner']);
    }
}
