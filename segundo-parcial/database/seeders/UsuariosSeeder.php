<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Rol;
use Illuminate\Database\Seeder;

class UsuariosSeeder extends Seeder
{
    public function run(): void
    {
        $usersData = [
            [
                'nombre'      => 'Admin',
                'apellido'    => 'Principal',
                'usuario'     => 'admin',
                'email'       => 'admin@sistema.com',
                'password'    => 'Admin123*',
                'rol'         => 'administrador',
            ],
            [
                'nombre'      => 'Autoridad',
                'apellido'    => 'Principal',
                'usuario'     => 'autoridad',
                'email'       => 'autoridad@sistema.com',
                'password'    => 'Autoridad123*',
                'rol'         => 'autoridad',
            ],
            [
                'nombre'      => 'Coordinador',
                'apellido'    => 'Principal',
                'usuario'     => 'coordinador',
                'email'       => 'coordinador@sistema.com',
                'password'    => 'Coordinador123*',
                'rol'         => 'coordinador',
            ],
            [
                'nombre'      => 'Docente',
                'apellido'    => 'Principal',
                'usuario'     => 'docente',
                'email'       => 'docente@sistema.com',
                'password'    => 'Docente123*',
                'rol'         => 'docente',
            ],
            [
                'nombre'      => 'Postulante',
                'apellido'    => 'Principal',
                'usuario'     => 'postulante',
                'email'       => 'postulante@sistema.com',
                'password'    => 'Postulante123*',
                'rol'         => 'postulante',
            ],
        ];

        $roles = Rol::whereIn('nombre', ['administrador', 'autoridad', 'coordinador', 'docente', 'postulante'])
            ->get()
            ->keyBy('nombre');

        $created = 0;
        $updated = 0;

        foreach ($usersData as $ud) {
            $user = User::updateOrCreate(
                ['email' => $ud['email']],
                [
                    'nombre'   => $ud['nombre'],
                    'apellido' => $ud['apellido'],
                    'password' => $ud['password'],
                    'rol_id'   => $roles[$ud['rol']]->id,
                    'activo'   => true,
                ]
            );

            if ($user->wasRecentlyCreated) {
                $created++;
                $this->command->info("✓ Creado: {$ud['nombre']} {$ud['apellido']} ({$ud['rol']}) — {$ud['email']}");
            } else {
                $updated++;
                $this->command->info("✓ Actualizado: {$ud['nombre']} {$ud['apellido']} ({$ud['rol']}) — {$ud['email']}");
            }
        }

        $this->command->info("Resumen: {$created} usuarios creados, {$updated} usuarios actualizados.");
    }
}
