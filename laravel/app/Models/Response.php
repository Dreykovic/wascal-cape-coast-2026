<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Response extends Model
{
    protected $fillable = [
        'full_name', 'delegation', 'floor',
        'committee_rank', 'activities', 'proposed_activities', 'talents',
        'english_level', 'dietary', 'notes', 'assigned_committee',
    ];

    // SQLite (local) et MySQL (prod) : Eloquent (dé)sérialise ces colonnes JSON en tableaux.
    protected $casts = [
        'committee_rank' => 'array',
        'activities' => 'array',
        'proposed_activities' => 'array',
        'talents' => 'array',
    ];

    // Comité effectif = assigné à la main par l'admin s'il existe, sinon comité demandé au sondage.
    public function effectiveCommittee(): ?string
    {
        return $this->assigned_committee ?: ($this->committee_rank[0] ?? null);
    }

    // Comité demandé au sondage (committee_rank[0]).
    public function requestedCommittee(): ?string
    {
        return $this->committee_rank[0] ?? null;
    }
}
