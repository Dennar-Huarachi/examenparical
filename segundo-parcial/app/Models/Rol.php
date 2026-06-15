<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rol extends Model
{
    protected $table = 'roles';

    protected $fillable = ['nombre', 'descripcion'];

    public function privilegios()
    {
        return $this->belongsToMany(Privilegio::class, 'rol_privilegio', 'rol_id', 'privilegio_id');
    }

    public function users()
    {
        return $this->hasMany(User::class, 'rol_id');
    }
}
