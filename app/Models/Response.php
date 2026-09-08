<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Response extends Model
{
    protected $fillable = [
        'full_name', 'delegation', 'floor',
        'activities', 'proposed_activities', 'talents',
        'english_level', 'dietary', 'notes',
    ];

    // SQLite (local) et MySQL (prod) : Eloquent (dé)sérialise ces colonnes JSON en tableaux.
    protected $casts = [
        'activities' => 'array',
        'proposed_activities' => 'array',
        'talents' => 'array',
    ];
}
