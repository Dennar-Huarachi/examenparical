import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/authprovider';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PostulantesPage from './pages/PostulantesPage';
import PagosPage from './pages/PagosPage';
import GestionRoles from './pages/GestionRoles';
import GestionPrivilegios from './pages/GestionPrivilegios';
import GestionPage from './pages/GestionPage';
import CarrerasPage from './pages/CarrerasPage';
import MateriasPage from './pages/MateriasPage';
import AulasPage from './pages/AulasPage';
import TurnosYHorariosPage from './pages/TurnosYHorariosPage';
import UsuariosPage from './pages/UsuariosPage';
import ContratacionPage from './pages/ContratacionPage';
import DocentesPage from './pages/DocentesPage';
import MiCargaPage from './pages/MiCargaPage';
import GruposPage from './pages/GruposPage';
import NotasPage from './pages/NotasPage';
import AsignacionCarreraPage from './pages/AsignacionCarreraPage';
import ReportesPage from './pages/ReportesPage';
import BitacoraPage from './pages/BitacoraPage';
import RecuperarPasswordPage from './pages/RecuperarPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CambiarPasswordPage from './pages/CambiarPasswordPage';
import PagoRegistro from './pages/PagoRegistro';
import ProbarPagoPage from './pages/ProbarPagoPage';
import MiInscripcionPage from './pages/MiInscripcionPage';

// Componente para proteger rutas de accesos no autenticados
function ProtectedRoute({ children }) {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

// Componente para restringir vistas basadas en privilegios
function PrivilegeProtectedRoute({ privilege, children }) {
    const userString = localStorage.getItem('user');
    if (!userString) {
        return <Navigate to="/login" replace />;
    }
    
    try {
        const user = JSON.parse(userString);
        const hasPrivilege = user?.privilegios?.includes(privilege);
        if (!hasPrivilege) {
            return <Navigate to="/dashboard" replace />;
        }
    } catch (e) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Rutas públicas (sin autenticación) */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/recuperar-password" element={<RecuperarPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/pago-registro" element={<PagoRegistro />} />

                    {/* Rutas Privadas envueltas en el Layout */}
                    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        
                        <Route path="/postulantes" element={
                            <PrivilegeProtectedRoute privilege="postulantes.ver">
                                <PostulantesPage />
                            </PrivilegeProtectedRoute>
                        } />
                        
                        <Route path="/pagos" element={
                            <PrivilegeProtectedRoute privilege="pagos.ver">
                                <PagosPage />
                            </PrivilegeProtectedRoute>
                        } />

                        <Route path="/probar-pago" element={
                            <PrivilegeProtectedRoute privilege="pagos.ver">
                                <ProbarPagoPage />
                            </PrivilegeProtectedRoute>
                        } />

                        <Route path="/roles" element={
                            <PrivilegeProtectedRoute privilege="usuarios.ver">
                                <GestionRoles />
                            </PrivilegeProtectedRoute>
                        } />

                        <Route path="/privilegios" element={
                            <PrivilegeProtectedRoute privilege="usuarios.ver">
                                <GestionPrivilegios />
                            </PrivilegeProtectedRoute>
                        } />

                        <Route path="/carreras" element={
                            <PrivilegeProtectedRoute privilege="carreras.ver">
                                <CarrerasPage />
                            </PrivilegeProtectedRoute>
                        } />

                        <Route path="/materias" element={
                            <PrivilegeProtectedRoute privilege="materias.ver">
                                <MateriasPage />
                            </PrivilegeProtectedRoute>
                        } />

                        <Route path="/aulas" element={
                            <PrivilegeProtectedRoute privilege="aulas.ver">
                                <AulasPage />
                            </PrivilegeProtectedRoute>
                        } />

                        <Route path="/turnos-horarios" element={
                            <PrivilegeProtectedRoute privilege="horarios.ver">
                                <TurnosYHorariosPage />
                            </PrivilegeProtectedRoute>
                        } />
                        <Route path="/turnos" element={<Navigate to="/turnos-horarios" replace />} />
                        <Route path="/horarios" element={<Navigate to="/turnos-horarios" replace />} />

                        <Route path="/grupos" element={
                            <PrivilegeProtectedRoute privilege="grupos.ver">
                                <GruposPage />
                            </PrivilegeProtectedRoute>
                        } />

                        <Route path="/notas" element={<NotasPage />} />

                        <Route path="/asignacion-carrera" element={<AsignacionCarreraPage />} />

                        <Route path="/reportes" element={<ReportesPage />} />

                        <Route path="/bitacora" element={<BitacoraPage />} />

                        <Route path="/gestiones" element={
                            <PrivilegeProtectedRoute privilege="gestiones.ver">
                                <GestionPage />
                            </PrivilegeProtectedRoute>
                        } />

                        <Route path="/usuarios" element={
                            <PrivilegeProtectedRoute privilege="usuarios.ver">
                                <UsuariosPage />
                            </PrivilegeProtectedRoute>
                        } />

                        <Route path="/contratacion" element={
                            <PrivilegeProtectedRoute privilege="docentes.contratar">
                                <ContratacionPage />
                            </PrivilegeProtectedRoute>
                        } />

                        <Route path="/docentes" element={
                            <PrivilegeProtectedRoute privilege="docentes.carga_horaria">
                                <DocentesPage />
                            </PrivilegeProtectedRoute>
                        } />

                        <Route path="/mi-carga" element={<MiCargaPage />} />

                        <Route path="/mi-inscripcion" element={
                            <PrivilegeProtectedRoute privilege="postulante.registro">
                                <MiInscripcionPage />
                            </PrivilegeProtectedRoute>
                        } />
                        <Route path="/cambiar-contrasena" element={<CambiarPasswordPage />} />
                        <Route path="/cambiar-password" element={<Navigate to="/cambiar-contrasena" replace />} />
                    </Route>

                    {/* Redirección por defecto */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}