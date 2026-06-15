<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['nombre', 'apellido', 'email', 'password', 'rol_id', 'activo'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'usuarios';

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'password' => 'hashed',
        ];
    }

    public function getNameAttribute()
    {
        return trim(($this->nombre ?? '') . ' ' . ($this->apellido ?? ''));
    }

    public function rol()
    {
        return $this->belongsTo(Rol::class, 'rol_id');
    }

    public function hasPrivilegio(string $nombre): bool
    {
        if ($this->esCoordinadorOAutoridad()) {
            return true;
        }

        if (!$this->rol) {
            return false;
        }

        return $this->rol->privilegios()->where('nombre', $nombre)->exists();
    }

    public function esCoordinadorOAutoridad(): bool
    {
        return $this->rol && in_array($this->rol->nombre, ['coordinador', 'autoridad']);
    }

    public function esDocente(): bool
    {
        return $this->rol && $this->rol->nombre === 'docente';
    }

    public function esPostulante(): bool
    {
        return $this->rol && $this->rol->nombre === 'postulante';
    }

    public function esCoordinador(): bool
    {
        return $this->rol && $this->rol->nombre === 'coordinador';
    }

    public function esAutoridad(): bool
    {
        return $this->rol && $this->rol->nombre === 'autoridad';
    }
}
