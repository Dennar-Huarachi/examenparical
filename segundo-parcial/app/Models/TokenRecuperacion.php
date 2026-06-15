<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TokenRecuperacion extends Model
{
    protected $table = 'tokens_recuperacion';

    protected $fillable = ['usuario_id', 'token', 'expira_at', 'usado'];

    protected $casts = [
        'expira_at' => 'datetime',
        'usado' => 'boolean',
    ];

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
