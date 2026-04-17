import type { Translations } from './en.js';

const es: Translations = {
  // ── App chrome ──
  app_title: 'Brew-TUI',
  pro_badge: 'PRO',
  app_version: 'Brew-TUI v{{version}}',

  // ── View labels (header tab bar) ──
  view_dashboard: 'Inicio',
  view_installed: 'Instalados',
  view_search: 'Buscar',
  view_outdated: 'Desactual.',
  view_packageInfo: 'Info Paq.',
  view_services: 'Servicios',
  view_doctor: 'Doctor',
  view_profiles: 'Perfiles',
  view_smartCleanup: 'Limpieza',
  view_history: 'Historial',
  view_securityAudit: 'Seguridad',
  view_account: 'Cuenta',

  // ── Keyboard hint actions ──
  hint_navigate: 'navegar',
  hint_next: 'siguiente',
  hint_quit: 'salir',
  hint_filter: 'filtrar',
  hint_info: 'info',
  hint_toggle: 'cambiar',
  hint_typeToSearch: 'escriba para buscar',
  hint_install: 'instalar',
  hint_uninstall: 'desinstalar',
  hint_upgrade: 'actualizar',
  hint_upgradeAll: 'actualizar todo',
  hint_back: 'volver',
  hint_start: 'iniciar',
  hint_stop: 'detener',
  hint_restart: 'reiniciar',
  hint_refresh: 'refrescar',
  hint_new: 'nuevo',
  hint_details: 'detalles',
  hint_import: 'importar',
  hint_delete: 'eliminar',
  hint_clean: 'limpiar',
  hint_all: 'todo',
  hint_search: 'buscar',
  hint_clear: 'borrar',
  hint_scan: 'escanear',
  hint_expand: 'expandir',
  hint_rescan: 're-escanear',
  hint_deactivate: 'desactivar',
  hint_importProfile: 'importar este perfil',
  hint_lang: 'idioma',

  // ── Loading / progress ──
  loading_default: 'Cargando...',
  loading_fetchingBrew: 'Obteniendo datos de Homebrew...',
  loading_installed: 'Cargando paquetes instalados...',
  loading_outdated: 'Buscando paquetes desactualizados...',
  loading_services: 'Cargando servicios...',
  loading_doctor: 'Ejecutando brew doctor... (puede tardar un momento)',
  loading_profiles: 'Cargando perfiles...',
  loading_cleanup: 'Analizando paquetes... (verificando uso de disco)',
  loading_history: 'Cargando historial...',
  loading_security: 'Escaneando paquetes en la base de datos de vulnerabilidades OSV...',
  loading_searching: 'Buscando...',
  loading_package: 'Cargando {{name}}...',

  // ── Confirm dialog ──
  confirm_yes: '[S]\u00ED',
  confirm_no: '[N]o',

  // ── Error ──
  error_prefix: 'Error: ',

  // ── Common ──
  common_andMore: '...y {{count}} m\u00E1s',
  common_exit: '(salida {{code}})',
  common_yes: 's\u00ED',
  common_no: 'no',

  // ── Relative time ──
  time_justNow: 'ahora',
  time_minutesAgo: 'hace {{n}}m',
  time_hoursAgo: 'hace {{n}}h',
  time_daysAgo: 'hace {{n}}d',
  time_monthsAgo: 'hace {{n}}me',

  // ── Badges ──
  badge_outdated: 'desactualizado',
  badge_pinned: 'fijado',
  badge_kegOnly: 'keg-only',
  badge_dep: 'dep',
  badge_installed: 'instalado',
  badge_deprecated: 'obsoleto',
  badge_ok: 'ok',
  badge_fail: 'fallo',
  badge_error: 'error',

  // ── Dashboard ──
  dashboard_overview: 'Resumen',
  dashboard_formulae: 'Formulae',
  dashboard_casks: 'Casks',
  dashboard_outdated: 'Desactualizados',
  dashboard_services: 'Servicios',
  dashboard_systemInfo: 'Info del Sistema',
  dashboard_homebrew: 'Homebrew:',
  dashboard_prefix: 'Prefijo:',
  dashboard_updated: 'Actualizado:',
  dashboard_outdatedPackages: 'Paquetes Desactualizados',
  dashboard_serviceErrors: 'Errores de Servicios',

  // ── Installed ──
  installed_formulaeCount: 'Formulae ({{count}})',
  installed_casksCount: 'Casks ({{count}})',
  installed_filterDisplay: 'Filtro: "{{query}}" ({{count}} coincidencias)',
  installed_noPackages: 'No se encontraron paquetes',

  // ── Search ──
  search_placeholder: 'Buscar paquetes Homebrew... (enter para buscar)',
  search_resultsFor: 'Resultados para',
  search_escToClear: '(esc para limpiar)',
  search_installing: 'Instalando paquete...',
  search_installComplete: '\u00A1Instalaci\u00F3n completa!',
  search_confirmInstall: '\u00BFInstalar {{name}}?',
  search_formulaeHeader: '=== Formulae ({{count}})',
  search_casksHeader: '=== Casks ({{count}})',
  search_noResults: 'Sin resultados',

  // ── Outdated ──
  outdated_title: 'Paquetes Desactualizados ({{count}})',
  outdated_upgrading: 'Actualizando...',
  outdated_upgradeComplete: '\u00A1Actualizaci\u00F3n completa!',
  outdated_pressRefresh: '(presiona r para refrescar)',
  outdated_upToDate: '\u00A1Todo est\u00E1 al d\u00EDa!',
  outdated_confirmAll: '\u00BFActualizar los {{count}} paquetes?',
  outdated_confirmSingle: '\u00BFActualizar {{name}}?',
  outdated_pinned: '[fijado]',

  // ── Package Info ──
  pkgInfo_noPackage: 'Ning\u00FAn paquete seleccionado. Ve a Instalados y presiona Enter en un paquete.',
  pkgInfo_notFound: 'Paquete no encontrado',
  pkgInfo_installing: 'Instalando {{name}}...',
  pkgInfo_uninstalling: 'Desinstalando {{name}}...',
  pkgInfo_upgrading: 'Actualizando {{name}}...',
  pkgInfo_done: '\u00A1Listo!',
  pkgInfo_confirmInstall: '\u00BFinstalar {{name}}?',
  pkgInfo_confirmUninstall: '\u00BFdesinstalar {{name}}?',
  pkgInfo_confirmUpgrade: '\u00BFactualizar {{name}}?',
  pkgInfo_details: 'Detalles',
  pkgInfo_homepage: 'Web:',
  pkgInfo_license: 'Licencia:',
  pkgInfo_tap: 'Tap:',
  pkgInfo_stable: 'Estable:',
  pkgInfo_installed: 'Instalado:',
  pkgInfo_bottle: 'Bottle:',
  pkgInfo_onRequest: 'Por solicitud:',
  pkgInfo_noDependency: 'no (dependencia)',
  pkgInfo_dependencies: 'Dependencias ({{count}})',
  pkgInfo_caveats: 'Advertencias',

  // ── Services ──
  services_title: 'Servicios Homebrew',
  services_titleCount: 'Servicios Homebrew ({{count}})',
  services_noServices: 'No se encontraron servicios',
  services_name: 'Nombre',
  services_status: 'Estado',
  services_user: 'Usuario',
  services_processing: 'Procesando...',

  // ── Doctor ──
  doctor_title: 'Homebrew Doctor',
  doctor_clean: 'Tu sistema est\u00E1 listo para brew.',
  doctor_warningsNotCaptured: 'Doctor termin\u00F3 con advertencias pero no se capturaron.',

  // ── Profiles ──
  profiles_title: 'Perfiles de Paquetes ({{count}})',
  profiles_importTitle: 'Importando perfil...',
  profiles_importComplete: 'Importaci\u00F3n completa. Presiona cualquier tecla.',
  profiles_createName: 'Crear Perfil \u2014 Nombre:',
  profiles_namePlaceholder: 'ej. trabajo, personal, proyecto-x',
  profiles_createDesc: 'Crear Perfil "{{name}}" \u2014 Descripci\u00F3n:',
  profiles_descPlaceholder: 'Breve descripci\u00F3n de esta configuraci\u00F3n',
  profiles_created: 'Creado: {{date}}',
  profiles_formulaeCount: 'Formulae ({{count}})',
  profiles_casksCount: 'Casks ({{count}})',
  profiles_confirmDelete: '\u00BFEliminar perfil "{{name}}"?',
  profiles_noProfiles: 'A\u00FAn no hay perfiles guardados.',
  profiles_press: 'Presiona',
  profiles_exportHint: 'para exportar tu configuraci\u00F3n actual como perfil.',

  // ── Smart Cleanup ──
  cleanup_title: 'Limpieza Inteligente',
  cleanup_cleaning: 'Limpiando...',
  cleanup_complete: '\u00A1Limpieza completa! Presiona r para re-analizar.',
  cleanup_orphans: 'Hu\u00E9rfanos',
  cleanup_reclaimable: 'Recuperable',
  cleanup_selected: 'Seleccionados',
  cleanup_confirmUninstall: '\u00BFDesinstalar {{count}} paquetes?',
  cleanup_systemClean: '\u00A1No se encontraron paquetes hu\u00E9rfanos. Tu sistema est\u00E1 limpio!',

  // ── History ──
  history_title: 'Historial de Acciones ({{count}})',
  history_filterLabel: 'filtro: {{filter}}',
  history_searchPlaceholder: 'Buscar paquetes...',
  history_confirmClear: '\u00BFBorrar las {{count}} entradas del historial?',
  history_noEntries: 'Sin entradas en el historial',
  history_noEntriesFor: 'Sin entradas en el historial para "{{filter}}"',
  history_all: '(todos)',
  history_actionInstall: 'instalar',
  history_actionUninstall: 'desinstalar',
  history_actionUpgrade: 'actualizar',
  history_actionUpgradeAll: 'actualizar-todo',

  // ── Security Audit ──
  security_title: 'Auditor\u00EDa de Seguridad',
  security_scanned: 'Escaneados',
  security_vulnerable: 'Vulnerables',
  security_critical: 'Cr\u00EDticos',
  security_high: 'Altos',
  security_medium: 'Medios',
  security_noVulns: '\u00A1No se encontraron vulnerabilidades conocidas en tus paquetes instalados!',
  security_fixedIn: 'Corregido en: {{version}}',

  // ── Account ──
  account_title: 'Cuenta y Licencia',
  account_confirmDeactivate: '\u00BFDesactivar tu licencia Pro en esta m\u00E1quina?',
  account_statusLabel: 'Estado:',
  account_pro: '[Pro]',
  account_free: '[Gratis]',
  account_expired: '[Expirada]',
  account_validating: '[Validando...]',
  account_emailLabel: 'Email:',
  account_nameLabel: 'Nombre:',
  account_planLabel: 'Plan:',
  account_monthlyPrice: '$9/mes',
  account_yearlyPrice: '$49/a\u00F1o',
  account_keyLabel: 'Clave:',
  account_expiresLabel: 'Expira:',
  account_activatedLabel: 'Activado:',
  account_upgradeTitle: 'Actualiza a Brew-TUI Pro',
  account_unlockDesc: 'Desbloquea Perfiles, Limpieza Inteligente, Historial y Auditor\u00EDa de Seguridad.',
  account_pricing: '$9/mes o $49/a\u00F1o',
  account_runActivate: 'Ejecuta:',
  account_activateCmd: 'brew-tui activate <clave>',
  account_licenseExpired: 'Tu licencia ha expirado. Renueva para seguir usando las funciones Pro.',
  account_deactivating: 'Desactivando...',

  // ── Upgrade Prompt ──
  upgrade_proFeature: '{{title}} \u2014 Funci\u00F3n Pro',
  upgrade_profiles: 'Perfiles de Paquetes',
  upgrade_profilesDesc: 'Exporta e importa tu configuraci\u00F3n de Homebrew entre m\u00E1quinas. Guarda perfiles con nombre para trabajo, personal o proyectos espec\u00EDficos.',
  upgrade_cleanup: 'Limpieza Inteligente',
  upgrade_cleanupDesc: 'Encuentra paquetes hu\u00E9rfanos, analiza uso de disco por paquete y recupera espacio con limpieza inteligente de un clic.',
  upgrade_history: 'Historial de Acciones',
  upgrade_historyDesc: 'Rastrea cada instalaci\u00F3n, desinstalaci\u00F3n y actualizaci\u00F3n con marcas de tiempo. Busca y filtra tu historial de gesti\u00F3n de paquetes.',
  upgrade_security: 'Auditor\u00EDa de Seguridad',
  upgrade_securityDesc: 'Escanea paquetes instalados contra vulnerabilidades conocidas (CVEs). Ve niveles de severidad, versiones afectadas y correcciones disponibles.',
  upgrade_pricing: '$9/mes o $49/a\u00F1o',
  upgrade_activateWith: 'Activa con:',
  upgrade_activateCmd: 'brew-tui activate <tu-clave-de-licencia>',
  upgrade_proLabel: 'Brew-TUI Pro \u2014 $9/mes o $49/a\u00F1o',

  // ── Progress Log ──
  progress_noOutput: 'Sin salida a\u00FAn',

  // ── Search Input ──
  searchInput_placeholder: 'Escriba para filtrar...',

  // ── Profile Manager ──
  profileMgr_tapping: 'A\u00F1adiendo tap {{name}}...',
  profileMgr_installing: 'Instalando {{name}}...',
  profileMgr_installingCask: 'Instalando cask {{name}}...',
  profileMgr_importDone: '\u00A1Listo! {{count}} paquetes instalados.',

  // ── CLI ──
  cli_usageActivate: 'Uso: brew-tui activate <clave-de-licencia>',
  cli_activated: '\u2714 Pro activado para {{email}}',
  cli_plan: '  Plan: {{plan}}',
  cli_expires: '  Expira: {{date}}',
  cli_activationFailed: '\u2718 Activaci\u00F3n fallida: {{error}}',
  cli_noLicense: 'No se encontr\u00F3 licencia activa.',
  cli_deactivated: '\u2714 Licencia desactivada.',
  cli_planFree: 'Plan: Gratis',
  cli_planPro: 'Plan: Pro ({{plan}})',
  cli_upgradeHint: 'Ejecuta `brew-tui activate <clave>` para actualizar a Pro.',
  cli_email: 'Email: {{email}}',
  cli_status: 'Estado: {{status}}',

  // ── Plurals ──
  plural_vulns_one: '({{count}} vuln)',
  plural_vulns_other: '({{count}} vulns)',
  plural_warnings_one: '{{count}} advertencia',
  plural_warnings_other: '{{count}} advertencias',

  // ── Scroll indicators ──
  scroll_moreAbove: '\u2191 {{count}} m\u00E1s',
  scroll_moreBelow: '\u2193 {{count}} m\u00E1s',
};

export default es;
