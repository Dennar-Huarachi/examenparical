<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Privilegio extends Model
{
    protected $fillable = ['nombre', 'descripcion', 'modulo'];

    public function roles()
    {
        return $this->belongsToMany(Rol::class, 'rol_privilegio', 'privilegio_id', 'rol_id');
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($privilegio) {
            if (!$privilegio->modulo && str_contains($privilegio->nombre, '.')) {
                $privilegio->modulo = explode('.', $privilegio->nombre)[0];
            }
        });

        static::updating(function ($privilegio) {
            if (!$privilegio->modulo && str_contains($privilegio->nombre, '.')) {
                $privilegio->modulo = explode('.', $privilegio->nombre)[0];
            }
        });
    }
}
