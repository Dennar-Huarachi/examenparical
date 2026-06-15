<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PostulanteController;
use App\Http\Controllers\PagoController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RolController;
use App\Http\Controllers\PrivilegioController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GestionController;
use App\Http\Controllers\CarreraController;
use App\Http\Controllers\MateriaController;
use App\Http\Controllers\AulaController;
use App\Http\Controllers\TurnoController;
use App\Http\Controllers\HorarioController;
use App\Http\Controllers\GrupoController;
use App\Http\Controllers\DocenteController;
use App\Http\Controllers\ContratacionController;
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\PostulanteImportController;
use App\Http\Controllers\DocenteImportController;
use App\Http\Controllers\PagoCajaController;
use App\Http\Controllers\NotaController;
use App\Http\Controllers\AsignacionCarreraController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\BitacoraController;
use App\Http\Controllers\DocenteDisponibilidadController;
use App\Http\Controllers\CargaHorariaController;
use App\Http\Controllers\DistribucionCargaController;

Route::middleware([\Illuminate\Http\Middleware\HandleCors::class])->group(function () {

    // ==========================================
    // RUTAS FLUJO POSTULANTES Y PAGOS (públicas)
    // ==========================================
    Route::post('/pagos/stripe', [PagoController::class, 'stripePayment']);

    // ==========================================
    // RUTAS AUTENTICACIÓN (públicas)
    // ==========================================
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/recuperar-password', [AuthController::class, 'recuperarPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/cambiar-password', [AuthController::class, 'cambiarPassword']);
        Route::get('/auth/mis-privilegios', [AuthController::class, 'misPrivilegios']);
    });

    // ==========================================
    // RUTAS ROLES Y PRIVILEGIOS (protegidas)
    // ==========================================
    Route::middleware(['auth:sanctum', 'privilegio:usuarios.ver'])->group(function () {
        Route::get('/roles', [RolController::class, 'index']);
        Route::get('/roles/{id}', [RolController::class, 'show']);
        Route::post('/roles/{id}/privilegios', [RolController::class, 'syncPrivilegios']);
        Route::get('/privilegios', [PrivilegioController::class, 'index']);
        Route::get('/privilegios/{rolId}', [PrivilegioController::class, 'show']);
        Route::post('/privilegios', [PrivilegioController::class, 'store']);
    });

    // ==========================================
    // RUTAS PROTEGIDAS BAJO AUTH:SANCTUM + PRIVILEGIOS
    // ==========================================
    Route::middleware('auth:sanctum')->group(function () {

        // Dashboard
        Route::middleware('privilegio:dashboard.ver')->group(function () {
            Route::get('/dashboard', [DashboardController::class, 'getStats']);
        });

        // Gestión Académica
        Route::middleware('privilegio:gestiones.ver')->group(function () {
            Route::get('/gestiones', [GestionController::class, 'index']);
        });
        Route::middleware('privilegio:gestiones.crear')->group(function () {
            Route::post('/gestiones', [GestionController::class, 'store']);
        });
        Route::middleware('privilegio:gestiones.editar')->group(function () {
            Route::put('/gestiones/{id}', [GestionController::class, 'update']);
            Route::patch('/gestiones/{id}/activar', [GestionController::class, 'activate']);
        });
        Route::middleware('privilegio:gestiones.eliminar')->group(function () {
            Route::delete('/gestiones/{id}', [GestionController::class, 'destroy']);
        });

        // Carreras y Cupos
        Route::middleware('privilegio:carreras.ver')->group(function () {
            Route::get('/carreras', [CarreraController::class, 'index']);
        });
        Route::middleware('privilegio:carreras.crear')->group(function () {
            Route::post('/carreras', [CarreraController::class, 'store']);
        });
        Route::middleware('privilegio:carreras.editar')->group(function () {
            Route::put('/carreras/{id}', [CarreraController::class, 'update']);
            Route::patch('/carreras/{id}/cupos', [CarreraController::class, 'updateCupos']);
        });
        Route::middleware('privilegio:carreras.eliminar')->group(function () {
            Route::delete('/carreras/{id}', [CarreraController::class, 'destroy']);
        });

        // Materias y Pesos
        Route::middleware('privilegio:materias.ver')->group(function () {
            Route::get('/materias', [MateriaController::class, 'index']);
        });
        Route::middleware('privilegio:materias.crear')->group(function () {
            Route::post('/materias', [MateriaController::class, 'store']);
        });
        Route::middleware('privilegio:materias.editar')->group(function () {
            Route::put('/materias/{id}', [MateriaController::class, 'update']);
            Route::post('/materias/reordenar', [MateriaController::class, 'reordenar']);
            Route::post('/materias/cargar-default', [MateriaController::class, 'cargarDefault']);
        });
        Route::middleware('privilegio:materias.eliminar')->group(function () {
            Route::delete('/materias/{id}', [MateriaController::class, 'destroy']);
        });

        // Gestión de Aulas
        Route::middleware('privilegio:aulas.ver')->group(function () {
            Route::get('/aulas', [AulaController::class, 'index']);
        });
        Route::middleware('privilegio:aulas.crear')->group(function () {
            Route::post('/aulas', [AulaController::class, 'store']);
        });
        Route::middleware('privilegio:aulas.editar')->group(function () {
            Route::put('/aulas/{id}', [AulaController::class, 'update']);
            Route::patch('/aulas/{id}/disponibilidad', [AulaController::class, 'toggleDisponible']);
        });
        Route::middleware('privilegio:aulas.eliminar')->group(function () {
            Route::delete('/aulas/{id}', [AulaController::class, 'destroy']);
        });

        // Turnos
        Route::middleware('privilegio:turnos.ver')->group(function () {
            Route::get('/turnos', [TurnoController::class, 'index']);
        });
        Route::middleware('privilegio:turnos.crear')->group(function () {
            Route::post('/turnos', [TurnoController::class, 'store']);
            Route::post('/turnos/cargar-default', [TurnoController::class, 'cargarDefault']);
        });
        Route::middleware('privilegio:turnos.editar')->group(function () {
            Route::put('/turnos/{id}', [TurnoController::class, 'update']);
        });
        Route::middleware('privilegio:turnos.eliminar')->group(function () {
            Route::delete('/turnos/{id}', [TurnoController::class, 'destroy']);
        });

        // Horarios
        Route::middleware('privilegio:horarios.ver')->group(function () {
            Route::get('/horarios', [HorarioController::class, 'index']);
            Route::get('/horarios/verificar-disponibilidad', [HorarioController::class, 'verificarDisponibilidad']);
            Route::get('/grupos/{grupoId}/horarios', [HorarioController::class, 'horariosDeGrupo']);
        });
        Route::middleware('privilegio:horarios.crear')->group(function () {
            Route::post('/horarios', [HorarioController::class, 'store']);
        });
        Route::middleware('privilegio:horarios.editar')->group(function () {
            Route::put('/horarios/{id}', [HorarioController::class, 'update']);
        });
        Route::middleware('privilegio:horarios.eliminar')->group(function () {
            Route::delete('/horarios/{id}', [HorarioController::class, 'destroy']);
        });

        // Grupos
        Route::middleware('privilegio:grupos.ver')->group(function () {
            Route::get('/grupos', [GrupoController::class, 'index']);
            Route::get('/grupos/{id}/postulantes', [GrupoController::class, 'postulantesDeGrupo']);
            Route::get('/grupos/estadisticas-asignacion', [GrupoController::class, 'estadisticasAsignacion']);
        });
        Route::middleware('privilegio:grupos.calcular')->group(function () {
            Route::post('/grupos/calcular', [GrupoController::class, 'calcular']);
            Route::post('/grupos/recalcular', [GrupoController::class, 'recalcular']);
        });
        Route::middleware('privilegio:grupos.asignar_postulantes')->group(function () {
            Route::post('/grupos/asignar-postulantes', [GrupoController::class, 'asignarPostulantes']);
            Route::post('/grupos/asignar-manual', [GrupoController::class, 'asignarPostulanteManual']);
            Route::post('/grupos/remover-postulante', [GrupoController::class, 'removerPostulante']);
        });
        Route::middleware('privilegio:grupos.asignar_docentes')->group(function () {
            Route::delete('/grupos/{id}', [GrupoController::class, 'destroy']);
        });

        // Contratación de docentes
        Route::middleware('privilegio:docentes.contratar')->group(function () {
            Route::get('/contratacion', [ContratacionController::class, 'index']);
            Route::get('/contratacion/{id}', [ContratacionController::class, 'show']);
            Route::patch('/contratacion/{id}/contratar', [ContratacionController::class, 'contratar']);
            Route::patch('/contratacion/{id}/rechazar', [ContratacionController::class, 'rechazar']);
            Route::patch('/contratacion/{id}/revertir', [ContratacionController::class, 'revertir']);
        });

        // Docentes contratados y carga horaria
        Route::middleware('privilegio:docentes.ver')->group(function () {
            Route::get('/docentes', [DocenteController::class, 'index']);
            Route::get('/docentes/{id}', [DocenteController::class, 'show'])->whereNumber('id');
        });
        Route::middleware('privilegio:docentes.carga_horaria')->group(function () {
            Route::patch('/docentes/{id}/carga-horaria', [DocenteController::class, 'asignarCarga']);
            Route::post('/docentes/disponibilidad', [DocenteDisponibilidadController::class, 'setDisponibilidad']);
            Route::get('/docentes/{id}/disponibilidad', [DocenteDisponibilidadController::class, 'getDisponibilidad']);
            Route::post('/docentes/{id}/carga-manual', [CargaHorariaController::class, 'asignarManual']);
            Route::post('/docentes/{id}/carga-automatica', [CargaHorariaController::class, 'asignarAutomatico']);
            Route::post('/docentes/{id}/confirmar-automatica', [CargaHorariaController::class, 'confirmarAutomatico']);
            Route::get('/grupos-sin-docente', [CargaHorariaController::class, 'gruposSinDocente']);
            Route::get('/distribucion-carga/calcular', [DistribucionCargaController::class, 'calcularDistribucion']);
            Route::post('/distribucion-carga/aplicar', [DistribucionCargaController::class, 'aplicarDistribucion']);
            Route::get('/distribucion-carga/historial', [DistribucionCargaController::class, 'historial']);
        });

        // Mi Carga (docente)
        Route::middleware('privilegio:mi_info.ver')->group(function () {
            Route::get('/docentes/mi-carga', [DocenteController::class, 'miCarga']);
        });

        // Notas y Exámenes
        Route::middleware('privilegio:notas.ver')->group(function () {
            Route::get('/notas/{grupo_id}/{materia_id}', [NotaController::class, 'index']);
            Route::get('/notas/resumen/{grupo_id}', [NotaController::class, 'resumenGrupo']);
        });
        Route::middleware('privilegio:notas.registrar')->group(function () {
            Route::get('/notas/plantilla/{grupo_id}/{materia_id}', [NotaController::class, 'plantilla']);
            Route::post('/notas/importar', [NotaController::class, 'importar']);
            Route::put('/notas/examen/{examen_id}', [NotaController::class, 'editarNota']);
        });
        Route::middleware('privilegio:notas.calcular')->group(function () {
            Route::get('/asignacion-carrera/verificar', [AsignacionCarreraController::class, 'verificarListo']);
            Route::get('/asignacion-carrera/previsualizar', [AsignacionCarreraController::class, 'previsualizar']);
            Route::post('/asignacion-carrera/confirmar', [AsignacionCarreraController::class, 'confirmar']);
            Route::get('/asignacion-carrera/resultados', [AsignacionCarreraController::class, 'resultados']);
        });

        // Reportes
        Route::middleware('privilegio:reportes.ver')->group(function () {
            Route::get('/reportes/postulantes/estatico', [ReporteController::class, 'postulantesEstatico']);
            Route::get('/reportes/postulantes/dinamico', [ReporteController::class, 'postulantesDinamico']);
            Route::get('/reportes/grupos/estatico', [ReporteController::class, 'gruposEstatico']);
            Route::get('/reportes/grupos/dinamico', [ReporteController::class, 'gruposDinamico']);
        });
        Route::middleware('privilegio:reportes.exportar')->group(function () {
            Route::post('/reportes/exportar/excel', [ReporteController::class, 'exportarExcel']);
            Route::post('/reportes/exportar/pdf', [ReporteController::class, 'exportarPDF']);
        });

        // Bitácora (auditoría)
        Route::middleware('privilegio:auditoria.ver')->group(function () {
            Route::get('/bitacora/estadisticas', [BitacoraController::class, 'estadisticas']);
            Route::get('/bitacora/{sesion}/acciones', [BitacoraController::class, 'acciones']);
            Route::get('/bitacora', [BitacoraController::class, 'index']);
        });

        // Pagos en Caja
        Route::middleware('privilegio:pagos.ver')->group(function () {
            Route::get('/pagos', [PagoCajaController::class, 'index']);
        });
        Route::middleware('privilegio:pagos.crear')->group(function () {
            Route::post('/pagos', [PagoCajaController::class, 'store']);
        });
        Route::middleware('privilegio:pagos.verificar')->group(function () {
            Route::post('/pagos/verificar', [PagoCajaController::class, 'verificar']);
            Route::patch('/pagos/{id}/confirmar', [PagoCajaController::class, 'confirmarPago']);
            Route::patch('/pagos/{id}/rechazar', [PagoCajaController::class, 'rechazarPago']);
        });

        // Postulantes
        Route::middleware('privilegio:postulantes.ver')->group(function () {
            Route::get('/postulantes', [PostulanteController::class, 'index']);
            Route::get('/postulantes/{id}', [PostulanteController::class, 'show']);
        });
        Route::middleware('privilegio:postulantes.crear')->group(function () {
            Route::post('/postulantes', [PostulanteController::class, 'store']);
        });
        Route::middleware('privilegio:postulantes.editar')->group(function () {
            Route::put('/postulantes/{id}', [PostulanteController::class, 'update']);
        });
        Route::middleware('privilegio:postulantes.eliminar')->group(function () {
            Route::delete('/postulantes/{id}', [PostulanteController::class, 'destroy']);
        });

        // Usuarios
        Route::middleware('privilegio:usuarios.ver')->group(function () {
            Route::get('/usuarios', [UsuarioController::class, 'index']);
        });
        Route::middleware('privilegio:usuarios.crear')->group(function () {
            Route::post('/usuarios', [UsuarioController::class, 'store']);
        });
        Route::middleware('privilegio:usuarios.editar')->group(function () {
            Route::put('/usuarios/{id}', [UsuarioController::class, 'update']);
            Route::patch('/usuarios/{id}/reset-password', [UsuarioController::class, 'resetPassword']);
        });
        Route::middleware('privilegio:usuarios.eliminar')->group(function () {
            Route::delete('/usuarios/{id}', [UsuarioController::class, 'destroy']);
        });

        // Importaciones
        Route::middleware('privilegio:postulantes.crear')->group(function () {
            Route::get('/usuarios/plantilla-postulantes', [PostulanteImportController::class, 'descargarPlantilla']);
            Route::post('/usuarios/importar-postulantes', [PostulanteImportController::class, 'import']);
            Route::post('/usuarios/exportar-errores', [PostulanteImportController::class, 'exportarErrores']);
        });
        Route::middleware('privilegio:docentes.contratar')->group(function () {
            Route::get('/usuarios/plantilla-docentes', [DocenteImportController::class, 'descargarPlantilla']);
            Route::post('/usuarios/importar-docentes', [DocenteImportController::class, 'import']);
            Route::post('/usuarios/exportar-errores-docentes', [DocenteImportController::class, 'exportarErrores']);
        });
    });
});
