<?php

namespace App\Support;

// Nettoyage partagé (couleur hex de charte, URL http(s) bornée). Miroir des helpers de server.js.
class Sanitize
{
    public static function color($c): string
    {
        return preg_match('/^#[0-9a-fA-F]{6}$/', (string) ($c ?? '')) ? (string) $c : '#e85d1b';
    }

    public static function url($u): string
    {
        $s = trim((string) ($u ?? ''));

        return preg_match('#^https?://#i', $s) ? mb_substr($s, 0, 600) : '';
    }
}
