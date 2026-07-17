<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GalleryAlbum extends Model
{
    protected $fillable = ['title', 'color', 'drive_url', 'owner', 'sort_order'];

    public function photos(): HasMany
    {
        return $this->hasMany(GalleryPhoto::class, 'album_id')
            ->orderBy('sort_order')
            ->orderBy('id');
    }
}
