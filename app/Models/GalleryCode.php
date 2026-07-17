<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GalleryCode extends Model
{
    protected $primaryKey = 'owner';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['owner', 'code_hash'];
    protected $hidden = ['code_hash'];
}
