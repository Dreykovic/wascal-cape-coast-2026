<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JourneyStage extends Model
{
    protected $fillable = ['title', 'tag', 'date_label', 'body', 'sort_order'];

    // Nom + couleur de l'étiquette d'activité (cf. config('wascal.gallery_owners')), ou null.
    public function tagInfo(): ?array
    {
        if (! $this->tag) {
            return null;
        }

        return collect(config('wascal.gallery_owners'))->firstWhere('key', $this->tag);
    }
}
