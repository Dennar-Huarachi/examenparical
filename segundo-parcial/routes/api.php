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

Route::middleware([\Illuminate\Http\Middleware\HandleCors::class])->group(function () {
    
    // ==========================================
    // RUTAS FLUJO POSTULANTES Y PAGOS (públicas)
    // ==========================================
    Route::post('/pagos/stripe', [PagoController::class, 'stripePayment']);   // Pago con Stripe

    // ==========================================
    // RUTAS AUTENTICACIÓN
    // ==========================================
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/recuperar-password', [AuthController::class, 'recuperarPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/cambiar-password', [AuthController::class, 'cambiarPassword']);
    });

    // ==========================================
    // RUTAS ROLES Y PRIVILEGIOS
    // ==========================================
    Route::get('/roles', [RolController::class, 'index']);
    Route::post('/roles', [RolController::class, 'store']);
    Route::put('/roles/{id}', [RolController::class, 'update']);
    Route::delete('/roles/{id}', [RolController::class, 'destroy']);

    Route::get('/privilegios/{rolId}', [PrivilegioController::class, 'show']);
    Route::post('/privilegios', [PrivilegioController::class, 'store']);

    // ==========================================
    // RUTAS PROTEGIDAS BAJO AUTH:SANCTUM
    // ==========================================
    Route::middleware('auth:sanctum')->group(function () {
        // Dashboard / Estadísticas
        Route::get('/dashboard', [DashboardController::class, 'getStats']);
        // CU06: Gestión Académica
        Route::get('/gestiones', [GestionController::class, 'index']);
        Route::post('/gestiones', [GestionController::class, 'store']);
        Route::put('/gestiones/{id}', [GestionController::class, 'update']);
        Route::delete('/gestiones/{id}', [GestionController::class, 'destroy']);
        Route::patch('/gestiones/{id}/activar', [GestionController::class, 'activate']);

        // CU07: Carreras y Cupos
        Route::get('/carreras', [CarreraController::class, 'index']);
        Route::post('/carreras', [CarreraController::class, 'store']);
        Route::put('/carreras/{id}', [CarreraController::class, 'update']);
        Route::delete('/carreras/{id}', [CarreraController::class, 'destroy']);
        Route::patch('/carreras/{id}/cupos', [CarreraController::class, 'updateCupos']);

        // CU08: Materias y Pesos
        // IMPORTANTE: Las rutas específicas (reordenar, cargar-default) van ANTES de {id}
        Route::post('/materias/reordenar', [MateriaController::class, 'reordenar']);
        Route::post('/materias/cargar-default', [MateriaController::class, 'cargarDefault']);
        Route::get('/materias', [MateriaController::class, 'index']);
        Route::post('/materias', [MateriaController::class, 'store']);
        Route::put('/materias/{id}', [MateriaController::class, 'update']);
        Route::delete('/materias/{id}', [MateriaController::class, 'destroy']);

        // CU09: Gestión de Aulas
        Route::get('/aulas', [AulaController::class, 'index']);
        Route::post('/aulas', [AulaController::class, 'store']);
        Route::put('/aulas/{id}', [AulaController::class, 'update']);
        Route::delete('/aulas/{id}', [AulaController::class, 'destroy']);
        Route::patch('/aulas/{id}/disponibilidad', [AulaController::class, 'toggleDisponible']);

        // CU10: Turnos y Horarios
        Route::post('/turnos/cargar-default', [TurnoController::class, 'cargarDefault']);
        Route::get('/turnos', [TurnoController::class, 'index']);
        Route::post('/turnos', [TurnoController::class, 'store']);
        Route::put('/turnos/{id}', [TurnoController::class, 'update']);
        Route::delete('/turnos/{id}', [TurnoController::class, 'destroy']);

        Route::get('/grupos/{grupoId}/horarios', [HorarioController::class, 'horariosDeGrupo']);
        Route::get('/horarios', [HorarioController::class, 'index']);
        Route::post('/horarios', [HorarioController::class, 'store']);
        Route::put('/horarios/{id}', [HorarioController::class, 'update']);
        Route::delete('/horarios/{id}', [HorarioController::class, 'destroy']);

        // CU22 + CU23: Grupos
        Route::post('/grupos/calcular', [GrupoController::class, 'calcular']);
        Route::post('/grupos/recalcular', [GrupoController::class, 'recalcular']);
        Route::post('/grupos/asignar-postulantes', [GrupoController::class, 'asignarPostulantes']);
        Route::post('/grupos/asignar-manual', [GrupoController::class, 'asignarPostulanteManual']);
        Route::post('/grupos/remover-postulante', [GrupoController::class, 'removerPostulante']);
        Route::get('/grupos/estadisticas-asignacion', [GrupoController::class, 'estadisticasAsignacion']);
        Route::get('/grupos/{id}/postulantes', [GrupoController::class, 'postulantesDeGrupo']);
        Route::get('/grupos', [GrupoController::class, 'index']);
        Route::delete('/grupos/{id}', [GrupoController::class, 'destroy']);

        // CU19: Contratación de docentes
        Route::get('/contratacion', [ContratacionController::class, 'index']);
        Route::get('/contratacion/{id}', [ContratacionController::class, 'show']);
        Route::patch('/contratacion/{id}/contratar', [ContratacionController::class, 'contratar']);
        Route::patch('/contratacion/{id}/rechazar', [ContratacionController::class, 'rechazar']);
        Route::patch('/contratacion/{id}/revertir', [ContratacionController::class, 'revertir']);

        // CU20 + CU21: Docentes contratados y carga horaria
        Route::get('/docentes', [DocenteController::class, 'index']);
        Route::get('/docentes/mi-carga', [DocenteController::class, 'miCarga']);
        Route::get('/docentes/{id}', [DocenteController::class, 'show']);
        Route::patch('/docentes/{id}/carga-horaria', [DocenteController::class, 'asignarCarga']);

        // Notas y Exámenes
        Route::get('/notas/plantilla/{grupo_id}/{materia_id}', [NotaController::class, 'plantilla']);
        Route::post('/notas/importar', [NotaController::class, 'importar']);
        Route::get('/notas/{grupo_id}/{materia_id}', [NotaController::class, 'index']);
        Route::put('/notas/examen/{examen_id}', [NotaController::class, 'editarNota']);
        Route::get('/notas/resumen/{grupo_id}', [NotaController::class, 'resumenGrupo']);

        // CU27: Asignación de carreras por cupo
        Route::get('/asignacion-carrera/verificar', [AsignacionCarreraController::class, 'verificarListo']);
        Route::get('/asignacion-carrera/previsualizar', [AsignacionCarreraController::class, 'previsualizar']);
        Route::post('/asignacion-carrera/confirmar', [AsignacionCarreraController::class, 'confirmar']);
        Route::get('/asignacion-carrera/resultados', [AsignacionCarreraController::class, 'resultados']);

        // CU28, CU29, CU30: Reportes y Exportaciones
        Route::get('/reportes/postulantes/estatico', [ReporteController::class, 'postulantesEstatico']);
        Route::get('/reportes/postulantes/dinamico', [ReporteController::class, 'postulantesDinamico']);
        Route::get('/reportes/grupos/estatico', [ReporteController::class, 'gruposEstatico']);
        Route::get('/reportes/grupos/dinamico', [ReporteController::class, 'gruposDinamico']);
        Route::post('/reportes/exportar/excel', [ReporteController::class, 'exportarExcel']);
        Route::post('/reportes/exportar/pdf', [ReporteController::class, 'exportarPDF']);

        // CU32: Bitácora del Sistema
        Route::get('/bitacora/estadisticas', [BitacoraController::class, 'estadisticas']);
        Route::get('/bitacora/{sesion}/acciones', [BitacoraController::class, 'acciones']);
        Route::get('/bitacora', [BitacoraController::class, 'index']);

        // CU14: Gestión de Pagos en Caja
        Route::get('/pagos', [PagoCajaController::class, 'index']);
        Route::post('/pagos', [PagoCajaController::class, 'store']);
        Route::post('/pagos/verificar', [PagoCajaController::class, 'verificar']);
        Route::patch('/pagos/{id}/confirmar', [PagoCajaController::class, 'confirmarPago']);
        Route::patch('/pagos/{id}/rechazar', [PagoCajaController::class, 'rechazarPago']);

        // CU15, CU16, CU17, CU18: Postulantes
        Route::get('/postulantes', [PostulanteController::class, 'index']);
        Route::get('/postulantes/{id}', [PostulanteController::class, 'show']);
        Route::post('/postulantes', [PostulanteController::class, 'store']);
        Route::put('/postulantes/{id}', [PostulanteController::class, 'update']);
        Route::delete('/postulantes/{id}', [PostulanteController::class, 'destroy']);

        // CU11, CU12, CU13: Usuarios, Postulantes y Docentes
        Route::get('/usuarios/plantilla-postulantes', [PostulanteImportController::class, 'descargarPlantilla']);
        Route::post('/usuarios/importar-postulantes', [PostulanteImportController::class, 'import']);
        Route::post('/usuarios/exportar-errores', [PostulanteImportController::class, 'exportarErrores']);

        Route::get('/usuarios/plantilla-docentes', [DocenteImportController::class, 'descargarPlantilla']);
        Route::post('/usuarios/importar-docentes', [DocenteImportController::class, 'import']);
        Route::post('/usuarios/exportar-errores-docentes', [DocenteImportController::class, 'exportarErrores']);

        Route::get('/usuarios', [UsuarioController::class, 'index']);
        Route::post('/usuarios', [UsuarioController::class, 'store']);
        Route::put('/usuarios/{id}', [UsuarioController::class, 'update']);
        Route::delete('/usuarios/{id}', [UsuarioController::class, 'destroy']);
        Route::patch('/usuarios/{id}/reset-password', [UsuarioController::class, 'resetPassword']);
    });
});