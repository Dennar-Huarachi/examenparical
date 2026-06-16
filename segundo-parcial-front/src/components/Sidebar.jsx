import React, { useContext, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/authprovider';

const I = ({ d, cn }) => (
  <svg className={cn || 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

const S = {
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  clipboard: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  chart: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  arrow: 'M19 9l-7 7-7-7',
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
};

const ADMIN_ONLY = ['administrador'];
const ADMIN_COORD = ['administrador', 'coordinador'];
const ADMIN_COORD_AUTH = ['administrador', 'coordinador', 'autoridad'];
const ADMIN_COORD_DOC = ['administrador', 'coordinador', 'docente'];
const TODOS = ['administrador', 'coordinador', 'autoridad', 'docente', 'postulante'];

const modulos = [
  {
    nombre: 'Seguridad y autenticación',
    icono: S.lock,
    items: [
      { label: 'Cambiar contraseña', path: '/cambiar-contrasena', roles: TODOS },
      { label: 'Gestionar roles', path: '/roles', roles: ADMIN_ONLY, privilege: 'usuarios.ver' },
      { label: 'Gestionar privilegios', path: '/privilegios', roles: ADMIN_ONLY, privilege: 'usuarios.ver' },
      { label: 'Consultar bitácora', path: '/bitacora', roles: ADMIN_COORD_AUTH, privilege: 'auditoria.ver' },
    ],
  },
  {
    nombre: 'Configuración del sistema',
    icono: S.settings,
    items: [
      { label: 'Configurar gestión académica', path: '/gestiones', roles: ADMIN_COORD, privilege: 'gestiones.ver' },
      { label: 'Configurar carreras y cupos', path: '/carreras', roles: ADMIN_COORD, privilege: 'carreras.ver' },
      { label: 'Gestionar materias y pesos', path: '/materias', roles: ADMIN_COORD, privilege: 'materias.ver' },
      { label: 'Gestionar aulas', path: '/aulas', roles: ADMIN_COORD, privilege: 'aulas.ver' },
      { label: 'Gestionar turnos y horarios', path: '/turnos-horarios', roles: ADMIN_COORD, privilege: 'horarios.ver' },
    ],
  },
  {
    nombre: 'Gestión de usuarios',
    icono: S.users,
    items: [
      { label: 'Gestionar usuarios', path: '/usuarios', roles: ADMIN_COORD, privilege: 'usuarios.ver' },
      { label: 'Gestionar postulantes', path: '/postulantes', roles: ADMIN_COORD, privilege: 'postulantes.ver' },
      { label: 'Verificar pago y requisitos', path: '/pagos', roles: ADMIN_COORD, privilege: 'pagos.ver' },
      { label: 'Probar pago', path: '/probar-pago', roles: ADMIN_COORD, privilege: 'pagos.ver' },
      { label: 'Gestionar contratación de docentes', path: '/contratacion', roles: ADMIN_COORD, privilege: 'docentes.contratar' },
      { label: 'Asignar carga horaria a docentes', path: '/docentes', roles: ADMIN_COORD, privilege: 'docentes.carga_horaria' },
      { label: 'Consultar mi carga horaria', path: '/mi-carga', roles: ['administrador', 'coordinador', 'docente'], privilege: 'mi_info.ver' },
    ],
  },
  {
    nombre: 'Proceso académico',
    icono: S.clipboard,
    items: [
      { label: 'Gestionar grupos', path: '/grupos', roles: ADMIN_COORD, privilege: 'grupos.ver' },
      { label: 'Registrar y editar notas', path: '/notas', roles: ADMIN_COORD_DOC, privilege: 'notas.ver' },
      { label: 'Asignar carrera por cupo', path: '/asignacion-carrera', roles: ADMIN_COORD, privilege: 'notas.calcular' },
    ],
  },
  {
    nombre: 'Reportes',
    icono: S.chart,
    items: [
      { label: 'Generar reportes y estadísticas', path: '/reportes', roles: ADMIN_COORD_AUTH, privilege: 'reportes.ver' },
    ],
  },
];

export default function Sidebar() {
  const { user, logout, hasPrivilege } = useContext(AuthContext);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModulo, setActiveModulo] = useState(null);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const rol = user?.rol?.toLowerCase();

  const filtrarItems = (items) =>
    items.filter(item =>
      item.roles.includes(rol) &&
      (!item.privilege || user?.privilegios?.includes(item.privilege))
    );

  const modulosVisibles = modulos
    .map(mod => ({ ...mod, items: filtrarItems(mod.items) }))
    .filter(mod => mod.items.length > 0);

  // Auto-abrir el módulo que contiene la ruta activa
  useEffect(() => {
    const idx = modulosVisibles.findIndex(mod =>
      mod.items.some(item =>
        item.path && (location.pathname === item.path || location.pathname.startsWith(item.path + '/'))
      )
    );
    if (idx !== -1) {
      setActiveModulo(idx);
    }
  }, [location.pathname]);

  const toggleModulo = (idx) => {
    setActiveModulo(activeModulo === idx ? null : idx);
  };

  const linkClases = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
    }`;

  const dashboardClases = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
    }`;

  return (
    <>
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 bg-blue-900 hover:bg-blue-800 text-white rounded-md flex items-center justify-center shadow-lg transition-colors cursor-pointer"
        aria-label="Abrir menú"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`w-64 bg-slate-900 text-slate-100 flex flex-col fixed inset-y-0 left-0 z-40 shadow-xl border-r border-slate-800 transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}>
        {/* Logo / Branding */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-xs tracking-tight text-white truncate">Preu FICCT</h2>
              <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">Admisión CUP</span>
            </div>
          </div>
        </div>

        {/* User info compacto */}
        <div className="px-4 py-2 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-900 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {(user?.nombre?.charAt(0) || '') + (user?.apellido?.charAt(0) || '') || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200 truncate leading-tight">
                {user?.nombre ? `${user.nombre} ${user.apellido}` : user?.name || 'Usuario'}
              </p>
              <span className="text-[10px] text-slate-500 block truncate leading-tight">
                {user?.rol === 'coordinador' ? 'Coordinador' :
                 user?.rol === 'autoridad' ? 'Autoridad' :
                 user?.rol === 'docente' ? 'Docente' :
                 user?.rol === 'postulante' ? 'Postulante' :
                 user?.rol === 'administrador' ? 'Administrador' :
                 user?.rol || ''}
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard - enlace directo */}
        <div className="px-4 pt-3 pb-1">
          <NavLink to="/dashboard" className={dashboardClases}>
            <I d={S.home} />
            <span>Dashboard</span>
          </NavLink>
        </div>

        {/* Mi inscripción - visible si tiene privilegio */}
        {user?.privilegios?.includes('postulante.registro') && (
          <div className="px-4 pb-1">
            <NavLink to="/mi-inscripcion" className={dashboardClases}>
              <I d={S.clipboard} />
              <span>Mi inscripción</span>
            </NavLink>
          </div>
        )}

        {/* Módulos colapsables */}
        <nav className="flex-1 px-4 pb-4 space-y-1 overflow-y-auto sidebar-scroll">
          {modulosVisibles.map((mod, idx) => {
            const algunaActiva = mod.items.some(item =>
              item.path && (location.pathname === item.path || location.pathname.startsWith(item.path + '/'))
            );
            const abierto = activeModulo === idx;

            return (
              <div key={idx} className="space-y-0.5">
                <button
                  onClick={() => toggleModulo(idx)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    algunaActiva
                      ? 'bg-blue-600/20 text-blue-300'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  <I d={mod.icono} />
                  <span className="flex-1 text-left text-xs uppercase tracking-wider">{mod.nombre}</span>
                  <I d={S.arrow} cn={`w-4 h-4 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${abierto ? 'max-h-[999px]' : 'max-h-0'}`}>
                  <div className="pt-1 pb-1 space-y-0.5">
                    {mod.items.map((item, iidx) => (
                      <NavLink
                        key={iidx}
                        to={item.path}
                        className={linkClases}
                      >
                        <span className="pl-7 text-sm">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Cerrar sesión al fondo */}
        <div className="border-t border-slate-800 px-4 py-3">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-slate-400 hover:bg-red-800/30 hover:text-red-300 cursor-pointer"
          >
            <I d={S.logout} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
