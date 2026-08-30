export type SupportedLanguage = 'en' | 'ar' | 'es' | 'fr'

export interface TranslationDictionary {
  // Navigation
  navFriends: string
  navWorlds: string
  navAvatars: string
  navRadar: string
  navCleaner: string
  navProfile: string
  navSettings: string
  navGuide: string
  navTitle: string

  // Avatars Hub
  avatarsTitle: string
  avatarsDesc: string

  // Friends Hub
  friendsTitle: string
  friendsDesc: string
  totalCount: string
  tabAll: string
  tabFavorites: string
  tabOnline: string
  tabInWorld: string
  tabOffline: string
  searchPlaceholder: string
  sortStatus: string
  sortName: string
  sortLastSeen: string
  joinInstance: string
  joining: string
  lastSeen: string
  unfriend: string
  friendDetails: string
  nickname: string
  notesAndNick: string
  customNote: string
  saveNotes: string
  saving: string
  pastNames: string
  bio: string
  status: string
  platform: string
  socialLinks: string
  webProfile: string

  // Radar
  radarTitle: string
  radarDesc: string
  rescanLogs: string
  currentWorld: string
  occupants: string
  playersInRoom: string
  liveActivity: string
  visitHistory: string
  clearHistory: string
  copyInstance: string
  inspectUser: string

  // Worlds Hub
  worldsTitle: string
  worldsDesc: string
  searchWorlds: string
  tabTrending: string
  tabFavoritesWorlds: string
  tabRecent: string
  author: string
  capacity: string
  launchWorld: string

  // Settings
  settingsTitle: string
  settingsDesc: string
  saveAll: string
  savedNotice: string
  themeSection: string
  themeCurrent: string
  themeBlack: string
  themeDark: string
  themeMidnight: string
  themeEmerald: string
  themePink: string
  notifSection: string
  testPopup: string
  testSound: string
  cornerPlacement: string
  cornerBR: string
  cornerBL: string
  cornerTR: string
  cornerTL: string
  overlayToggle: string
  overlayToggleDesc: string
  soundAlertsToggle: string
  soundAlertsDesc: string
  startupSection: string
  startWithWindows: string
  startWithWindowsDesc: string
  minimizeToTray: string
  minimizeToTrayDesc: string
  logsSection: string
  logDir: string
  browse: string
  enableLogWatcher: string
  enableLogWatcherDesc: string
  syncSection: string
  autoRefresh: string
  autoRefreshDesc: string
  refreshInterval: string
  languageSection: string
  languageLabel: string
  openUserManual: string

  // Onboarding & Guide
  welcomeTitle: string
  welcomeSubtitle: string
  step1Title: string
  step1Desc: string
  step2Title: string
  step2Desc: string
  step3Title: string
  step3Desc: string
  step4Title: string
  step4Desc: string
  getStarted: string
  next: string
  back: string
  close: string

  // Cleaner
  cleanerTitle: string
  cleanerDesc: string
  deleteSelected: string
  selectAll: string
  deselectAll: string
}

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    navFriends: 'Friends Hub',
    navWorlds: 'Worlds Hub',
    navAvatars: 'Avatars',
    navRadar: 'Live Radar',
    navCleaner: 'Friend Cleaner',
    navProfile: 'My Profile',
    navSettings: 'Settings',
    navGuide: 'User Manual',
    navTitle: 'Navigate',

    avatarsTitle: 'Avatars Hub',
    avatarsDesc: 'Manage your uploaded avatars, saved favorites, and switch active avatar in-game.',

    friendsTitle: 'Friends Hub',
    friendsDesc: 'Favorite friend groups, live locations, nickname notes, and username history.',
    totalCount: 'Total',
    tabAll: 'All',
    tabFavorites: '★ Favorites',
    tabOnline: 'Online',
    tabInWorld: 'In World',
    tabOffline: 'Offline',
    searchPlaceholder: 'Search by display name, past username, nickname, or world...',
    sortStatus: 'Sort: Status & Favorites',
    sortName: 'Sort: Display Name (A-Z)',
    sortLastSeen: 'Sort: Last Seen',
    joinInstance: 'Join',
    joining: 'Joining...',
    lastSeen: 'Last seen',
    unfriend: 'Unfriend User',
    friendDetails: 'Friend Details',
    nickname: 'Custom Nickname',
    notesAndNick: 'Notes & Nickname',
    customNote: 'Private Note',
    saveNotes: 'Save Notes',
    saving: 'Saving...',
    pastNames: 'Previous Usernames',
    bio: 'Bio',
    status: 'Status',
    platform: 'Platform',
    socialLinks: 'Social Links',
    webProfile: 'VRChat Web Profile',

    radarTitle: 'Live Room Radar',
    radarDesc: 'Real-time instance occupant detection, game log parser, and room activity.',
    rescanLogs: 'Rescan Logs',
    currentWorld: 'Current World',
    occupants: 'Occupants in Instance',
    playersInRoom: 'Players in Room',
    liveActivity: 'Live Activity',
    visitHistory: 'Visited Instances',
    clearHistory: 'Clear History',
    copyInstance: 'Copy Launch Link',
    inspectUser: 'Inspect User',

    worldsTitle: 'Worlds Hub',
    worldsDesc: 'Explore trending VRChat worlds, search community instances, and launch directly.',
    searchWorlds: 'Search worlds by name, author, or tags...',
    tabTrending: 'Trending Worlds',
    tabFavoritesWorlds: 'Favorite Worlds',
    tabRecent: 'Recently Visited',
    author: 'Author',
    capacity: 'Capacity',
    launchWorld: 'Launch World',

    settingsTitle: 'Settings',
    settingsDesc: 'Themes, live notifications, language, game logs, and sync options.',
    saveAll: 'Save All',
    savedNotice: 'Settings applied successfully.',
    themeSection: 'Theme & Appearance',
    themeCurrent: 'Current Theme',
    themeBlack: 'Black',
    themeDark: 'Dark',
    themeMidnight: 'Midnight',
    themeEmerald: 'Emerald',
    themePink: 'Pink',
    notifSection: 'Live Notifications & Screen Position',
    testPopup: 'Test Notification Popup',
    testSound: 'Test Sound',
    cornerPlacement: 'Screen Corner Placement',
    cornerBR: 'Bottom Right',
    cornerBL: 'Bottom Left',
    cornerTR: 'Top Right',
    cornerTL: 'Top Left',
    overlayToggle: 'Always-on-Top Desktop Overlay',
    overlayToggleDesc: 'Display floating notification toasts on top of full-screen games, VRChat, and other apps.',
    soundAlertsToggle: 'Audio Chime on Join & World Change',
    soundAlertsDesc: 'Play sound effect whenever a player joins or a world changes.',
    startupSection: 'Windows Startup & System Tray',
    startWithWindows: 'Start VRCFX on Windows Boot',
    startWithWindowsDesc: 'Automatically start VRCFX silently in the background when your PC turns on.',
    minimizeToTray: 'Minimize to System Tray (Run in Background)',
    minimizeToTrayDesc: 'Keep tracking logs and receiving notifications when closing the app window.',
    logsSection: 'Game Logs & Live Radar',
    logDir: 'VRChat Log Directory',
    browse: 'Browse',
    enableLogWatcher: 'Enable Game Log Watcher',
    enableLogWatcherDesc: 'Streams live room joins, leaves, and instance switches in real time.',
    syncSection: 'Background Sync',
    autoRefresh: 'Auto-Refresh Friends List',
    autoRefreshDesc: 'Periodically fetch latest friend locations and statuses from VRChat API.',
    refreshInterval: 'Refresh Interval',
    languageSection: 'Language & Translation',
    languageLabel: 'App Language',
    openUserManual: 'Open User Manual & Feature Guide',

    welcomeTitle: 'Welcome to VRCFX',
    welcomeSubtitle: 'Your high-performance, real-time companion for VRChat.',
    step1Title: 'Friends Hub & Favorite Groups',
    step1Desc: 'Categorize your favorite friends, track past username history, write private notes, and see live world locations.',
    step2Title: 'Always-on-Top Game Overlay',
    step2Desc: 'Receive instant notifications floating directly over VRChat or any game when friends join or worlds change.',
    step3Title: 'Live Room Radar & Log Parser',
    step3Desc: 'Real-time detection of who enters or leaves your instance with 1-click player inspection and visit logs.',
    step4Title: 'Background Sync & System Tray',
    step4Desc: 'Runs quietly in your Windows system tray with auto-startup so you never miss a moment.',
    getStarted: 'Get Started with VRCFX',
    next: 'Next',
    back: 'Back',
    close: 'Close',

    cleanerTitle: 'Inactive Friends Cleaner',
    cleanerDesc: 'Identify friends who have been offline for months and clean your friends list easily.',
    deleteSelected: 'Remove Selected Friends',
    selectAll: 'Select All',
    deselectAll: 'Deselect All'
  },

  ar: {
    navFriends: 'قائمة الأصدقاء',
    navWorlds: 'استكشاف العوالم',
    navAvatars: 'الأفاتار والمجسمات',
    navRadar: 'الرادار المباشر',
    navCleaner: 'تنظيف الأصدقاء',
    navProfile: 'الملف الشخصي',
    navSettings: 'الإعدادات',
    navGuide: 'دليل الاستخدام',
    navTitle: 'التنقل',

    avatarsTitle: 'مركز الأفاتار',
    avatarsDesc: 'إدارة الأفاتار المرفوعة، والمفضلة المحفوظة، وتغيير الأفاتار داخل اللعبة فورياً.',

    friendsTitle: 'قائمة الأصدقاء',
    friendsDesc: 'مجموعات الأصدقاء المفضلة، والمواقع المباشرة، والملاحظات، وسجل الأسماء السابقة.',
    totalCount: 'الإجمالي',
    tabAll: 'الكل',
    tabFavorites: '★ المفضلة',
    tabOnline: 'متصل',
    tabInWorld: 'داخل عالم',
    tabOffline: 'غير متصل',
    searchPlaceholder: 'ابحث بالاسم، الاسم السابق، اللقب أو العالم...',
    sortStatus: 'ترتيب: الحالة والمفضلة',
    sortName: 'ترتيب: الاسم (أ-ي)',
    sortLastSeen: 'ترتيب: آخر ظهور',
    joinInstance: 'انضمام',
    joining: 'جاري الانضمام...',
    lastSeen: 'آخر ظهور',
    unfriend: 'إلغاء الصداقة',
    friendDetails: 'تفاصيل الصديق',
    nickname: 'اللقب المخصص',
    notesAndNick: 'الملاحظات واللقب',
    customNote: 'ملاحظة خاصة',
    saveNotes: 'حفظ الملاحظة',
    saving: 'جاري الحفظ...',
    pastNames: 'الأسماء السابقة',
    bio: 'السيرة الذاتية',
    status: 'الحالة',
    platform: 'المنصة',
    socialLinks: 'روابط التواصل',
    webProfile: 'الملف الشخصي على الويب',

    radarTitle: 'رادار الغرفة المباشر',
    radarDesc: 'كشف المتواجدين في العالم فورياً، وقراءة سجلات اللعبة في الوقت الحقيقي.',
    rescanLogs: 'إعادة فحص السجلات',
    currentWorld: 'العالم الحالي',
    occupants: 'المتواجدون في العالم',
    playersInRoom: 'اللاعبون في الغرفة',
    liveActivity: 'النشاط المباشر',
    visitHistory: 'العوالم التي تمت زيارتها',
    clearHistory: 'مسح السجل',
    copyInstance: 'نسخ رابط الدخول',
    inspectUser: 'فحص اللاعب',

    worldsTitle: 'استكشاف العوالم',
    worldsDesc: 'استكشف عوالم VRChat الشائعة، وابحث في العوالم وادخل بضغطة زر.',
    searchWorlds: 'ابحث عن العوالم بالاسم أو الصانع أو الوسم...',
    tabTrending: 'العوالم الشائعة',
    tabFavoritesWorlds: 'العوالم المفضلة',
    tabRecent: 'تمت زيارتها مؤخراً',
    author: 'الصانع',
    capacity: 'السعة',
    launchWorld: 'دخول العالم',

    settingsTitle: 'الإعدادات',
    settingsDesc: 'المظاهر، الإشعارات العائمة، اللغة، سجلات اللعبة وخيارات المزامنة.',
    saveAll: 'حفظ الكل',
    savedNotice: 'تم تطبيق الإعدادات بنجاح.',
    themeSection: 'المظهر والسمات',
    themeCurrent: 'السمة الحالية',
    themeBlack: 'أسود (AMOLED)',
    themeDark: 'داكن',
    themeMidnight: 'منتصف الليل',
    themeEmerald: 'زمردي',
    themePink: 'وردي',
    notifSection: 'الإشعارات المباشرة وموضع الشاشة',
    testPopup: 'تجربة الإشعار العائم',
    testSound: 'تجربة الصوت',
    cornerPlacement: 'موضع الإشعار في زاوية الشاشة',
    cornerBR: 'أسفل اليمين',
    cornerBL: 'أسفل اليسار',
    cornerTR: 'أعلى اليمين',
    cornerTL: 'أعلى اليسار',
    overlayToggle: 'إشعار عائم فوق جميع الألعاب',
    overlayToggleDesc: 'عرض نافذة الإشعار فوق الألعاب بملء الشاشة وVRChat والتطبيقات الأخرى.',
    soundAlertsToggle: 'تنبيه صوتي عند الدخول وتغيير العالم',
    soundAlertsDesc: 'تشغيل نغمة عند انضمام صديق أو تغيير الغرفة.',
    startupSection: 'بدء التشغيل مع ويندوز وشريط المهام',
    startWithWindows: 'التشغيل التلقائي مع بدء ويندوز',
    startWithWindowsDesc: 'تشغيل البرنامج تلقائياً في الخلفية عند فتح الكمبيوتر.',
    minimizeToTray: 'التصغير لشريط المهام (العمل في الخلفية)',
    minimizeToTrayDesc: 'مواصلة قراءة السجلات والإشعارات عند إغلاق النافذة.',
    logsSection: 'سجلات اللعبة والرادار المباشر',
    logDir: 'مجلد سجلات VRChat',
    browse: 'استعراض',
    enableLogWatcher: 'تفعيل مراقب السجلات المباشر',
    enableLogWatcherDesc: 'قراءة أحداث الدخول والخروج من الغرف فورياً.',
    syncSection: 'المزامنة في الخلفية',
    autoRefresh: 'تحديث تلقائي لقائمة الأصدقاء',
    autoRefreshDesc: 'جلب أحدث المواقع والحالات دورياً من سيرفرات VRChat.',
    refreshInterval: 'معدل التحديث',
    languageSection: 'اللغة والترجمة',
    languageLabel: 'لغة التطبيق',
    openUserManual: 'فتح دليل الاستخدام والتعليمات',

    welcomeTitle: 'مرحباً بك في VRCFX',
    welcomeSubtitle: 'تطبيقك المتقدم والمباشر لمرافقة VRChat.',
    step1Title: 'قائمة الأصدقاء والمجموعات المفضلة',
    step1Desc: 'صنف أصدقائك المفضلين، وتابع سجل الأسماء السابقة، واكتب الملاحظات واعرف مواقعهم فورياً.',
    step2Title: 'إشعارات عائمة فوق أي لعبة',
    step2Desc: 'استقبل إشعارات فورية تظهر فوق VRChat وأي لعبة بملء الشاشة عند دخول الأصدقاء أو تغيير العالم.',
    step3Title: 'رادار الغرفة المباشر',
    step3Desc: 'كشف مباشر لمن يدخل أو يخرج من غرفتك مع فحص أسماء اللاعبين وسجل الزيارات.',
    step4Title: 'العمل في الخلفية وبدء التشغيل مع ويندوز',
    step4Desc: 'يعمل بخفة في صينية النظام مع خيار البدء التلقائي حتى لا يفوتك أي حدث.',
    getStarted: 'ابدأ استخدام VRCFX',
    next: 'التالي',
    back: 'السابق',
    close: 'إغلاق',

    cleanerTitle: 'تنظيف الأصدقاء غير النشطين',
    cleanerDesc: 'حدد الأصدقاء المنقطعين منذ أشهر واحذفهم بسهولة لتنظيم قائمتك.',
    deleteSelected: 'حذف الأصدقاء المحددين',
    selectAll: 'تحديد الكل',
    deselectAll: 'إلغاء تحديد الكل'
  },

  es: {
    navFriends: 'Amigos',
    navWorlds: 'Mundos',
    navAvatars: 'Avatares',
    navRadar: 'Radar en Vivo',
    navCleaner: 'Limpiador',
    navProfile: 'Mi Perfil',
    navSettings: 'Ajustes',
    navGuide: 'Manual de Usuario',
    navTitle: 'Navegar',

    avatarsTitle: 'Panel de Avatares',
    avatarsDesc: 'Gestiona tus avatares subidos, guardados favoritos y cámbiate de avatar al instante.',

    friendsTitle: 'Panel de Amigos',
    friendsDesc: 'Grupos favoritos, ubicaciones en vivo, notas y nombres anteriores.',
    totalCount: 'Total',
    tabAll: 'Todos',
    tabFavorites: '★ Favoritos',
    tabOnline: 'En línea',
    tabInWorld: 'En Mundo',
    tabOffline: 'Desconectado',
    searchPlaceholder: 'Buscar por nombre, apodo o mundo...',
    sortStatus: 'Ordenar: Estado y Favoritos',
    sortName: 'Ordenar: Nombre (A-Z)',
    sortLastSeen: 'Ordenar: Visto por última vez',
    joinInstance: 'Unirse',
    joining: 'Uniéndose...',
    lastSeen: 'Visto por última vez',
    unfriend: 'Eliminar Amigo',
    friendDetails: 'Detalles del Amigo',
    nickname: 'Apodo Personalizado',
    notesAndNick: 'Notas y Apodo',
    customNote: 'Nota Privada',
    saveNotes: 'Guardar Notas',
    saving: 'Guardando...',
    pastNames: 'Nombres Anteriores',
    bio: 'Biografía',
    status: 'Estado',
    platform: 'Plataforma',
    socialLinks: 'Redes Sociales',
    webProfile: 'Perfil Web de VRChat',

    radarTitle: 'Radar de Sala en Vivo',
    radarDesc: 'Detección en tiempo real de ocupantes y registro de actividad del juego.',
    rescanLogs: 'Reescanear Registros',
    currentWorld: 'Mundo Actual',
    occupants: 'Jugadores en la Instancia',
    playersInRoom: 'Jugadores en la Sala',
    liveActivity: 'Actividad en Vivo',
    visitHistory: 'Instancias Visitadas',
    clearHistory: 'Borrar Historial',
    copyInstance: 'Copiar Enlace de Lanzamiento',
    inspectUser: 'Inspeccionar Usuario',

    worldsTitle: 'Explorador de Mundos',
    worldsDesc: 'Explora mundos populares de VRChat y únete con un solo clic.',
    searchWorlds: 'Buscar mundos por nombre o autor...',
    tabTrending: 'Mundos Populares',
    tabFavoritesWorlds: 'Mundos Favoritos',
    tabRecent: 'Visitados Recientemente',
    author: 'Autor',
    capacity: 'Capacidad',
    launchWorld: 'Entrar al Mundo',

    settingsTitle: 'Ajustes',
    settingsDesc: 'Temas, notificaciones flotantes, idioma, registros y sincronización.',
    saveAll: 'Guardar Todo',
    savedNotice: 'Ajustes guardados correctamente.',
    themeSection: 'Tema y Apariencia',
    themeCurrent: 'Tema Actual',
    themeBlack: 'Negro (AMOLED)',
    themeDark: 'Oscuro',
    themeMidnight: 'Medianoche',
    themeEmerald: 'Esmeralda',
    themePink: 'Rosa',
    notifSection: 'Notificaciones en Vivo y Posición',
    testPopup: 'Probar Notificación',
    testSound: 'Probar Sonido',
    cornerPlacement: 'Posición en la Pantalla',
    cornerBR: 'Abajo Derecha',
    cornerBL: 'Abajo Izquierda',
    cornerTR: 'Arriba Derecha',
    cornerTL: 'Arriba Izquierda',
    overlayToggle: 'Superposición Flotante Sobre Juegos',
    overlayToggleDesc: 'Mostrar notificaciones flotantes sobre juegos a pantalla completa y VRChat.',
    soundAlertsToggle: 'Alerta Sonora al Unirse o Cambiar Mundo',
    soundAlertsDesc: 'Reproducir sonido cuando alguien entra o cambia de mundo.',
    startupSection: 'Inicio de Windows y Bandeja del Sistema',
    startWithWindows: 'Iniciar con Windows',
    startWithWindowsDesc: 'Iniciar automáticamente en segundo plano al encender el PC.',
    minimizeToTray: 'Minimizar a la Bandeja del Sistema',
    minimizeToTrayDesc: 'Continuar ejecutándose en segundo plano al cerrar la ventana.',
    logsSection: 'Registros del Juego y Radar',
    logDir: 'Directorio de Registros de VRChat',
    browse: 'Examinar',
    enableLogWatcher: 'Activar Monitor de Registros',
    enableLogWatcherDesc: 'Detecta entradas, salidas e instancias en tiempo real.',
    syncSection: 'Sincronización en Segundo Plano',
    autoRefresh: 'Auto-refrescar Lista de Amigos',
    autoRefreshDesc: 'Obtener ubicaciones y estados automáticamente de VRChat.',
    refreshInterval: 'Intervalo de Refresco',
    languageSection: 'Idioma y Traducción',
    languageLabel: 'Idioma de la Aplicación',
    openUserManual: 'Abrir Manual de Usuario',

    welcomeTitle: 'Bienvenido a VRCFX',
    welcomeSubtitle: 'Tu compañero de alto rendimiento para VRChat.',
    step1Title: 'Panel de Amigos y Grupos Favoritos',
    step1Desc: 'Organiza favoritos, sigue nombres anteriores, añade notas y mira ubicaciones en vivo.',
    step2Title: 'Superposición Flotante Sobre Juegos',
    step2Desc: 'Recibe alertas que flotan sobre cualquier juego en pantalla completa.',
    step3Title: 'Radar en Vivo y Registro de Sala',
    step3Desc: 'Detección en tiempo real de quién entra o sale de tu instancia.',
    step4Title: 'Inicio Automático y Bandeja del Sistema',
    step4Desc: 'Funciona en segundo plano sin interrumpir tus juegos.',
    getStarted: 'Comenzar a Usar VRCFX',
    next: 'Siguiente',
    back: 'Atrás',
    close: 'Cerrar',

    cleanerTitle: 'Limpiador de Amigos Inactivos',
    cleanerDesc: 'Encuentra amigos que llevan meses inactivos y organiza tu lista fácilmente.',
    deleteSelected: 'Eliminar Amigos Seleccionados',
    selectAll: 'Seleccionar Todo',
    deselectAll: 'Deseleccionar Todo'
  },

  fr: {
    navFriends: 'Amis',
    navWorlds: 'Mondes',
    navAvatars: 'Avatars',
    navRadar: 'Radar en Direct',
    navCleaner: 'Nettoyeur',
    navProfile: 'Mon Profil',
    navSettings: 'Paramètres',
    navGuide: 'Manuel Utilisateur',
    navTitle: 'Naviguer',

    avatarsTitle: 'Gestion des Avatars',
    avatarsDesc: 'Gérez vos avatars téléversés, vos favoris enregistrés et changez d’avatar en un clic.',

    friendsTitle: 'Gestion des Amis',
    friendsDesc: 'Groupes favoris, emplacements en direct, notes et historiques de pseudos.',
    totalCount: 'Total',
    tabAll: 'Tous',
    tabFavorites: '★ Favoris',
    tabOnline: 'En Ligne',
    tabInWorld: 'En Monde',
    tabOffline: 'Hors Ligne',
    searchPlaceholder: 'Rechercher par nom, pseudo ou monde...',
    sortStatus: 'Trier: Statut et Favoris',
    sortName: 'Trier: Nom (A-Z)',
    sortLastSeen: 'Trier: Dernière Visite',
    joinInstance: 'Rejoindre',
    joining: 'Connexion...',
    lastSeen: 'Dernière visite',
    unfriend: 'Retirer l’ami',
    friendDetails: 'Détails de l’Ami',
    nickname: 'Surnom Personnalisé',
    notesAndNick: 'Notes et Surnom',
    customNote: 'Note Privée',
    saveNotes: 'Enregistrer',
    saving: 'Enregistrement...',
    pastNames: 'Anciens Pseudos',
    bio: 'Biographie',
    status: 'Statut',
    platform: 'Plateforme',
    socialLinks: 'Liens Sociaux',
    webProfile: 'Profil Web VRChat',

    radarTitle: 'Radar de Salle en Direct',
    radarDesc: 'Détection en temps réel des joueurs et analyse des journaux de jeu.',
    rescanLogs: 'Réanalyser les Journaux',
    currentWorld: 'Monde Actuel',
    occupants: 'Joueurs dans l’Instance',
    playersInRoom: 'Joueurs dans la Salle',
    liveActivity: 'Activité en Direct',
    visitHistory: 'Instances Visitées',
    clearHistory: 'Effacer l’Historique',
    copyInstance: 'Copier le Lien',
    inspectUser: 'Inspecter l’Utilisateur',

    worldsTitle: 'Explorateur de Mondes',
    worldsDesc: 'Découvrez les mondes populaires de VRChat et rejoignez en un clic.',
    searchWorlds: 'Rechercher des mondes par nom ou créateur...',
    tabTrending: 'Mondes Populaires',
    tabFavoritesWorlds: 'Mondes Favoris',
    tabRecent: 'Visités Récemment',
    author: 'Créateur',
    capacity: 'Capacité',
    launchWorld: 'Rejoindre le Monde',

    settingsTitle: 'Paramètres',
    settingsDesc: 'Thèmes, notifications flottantes, langue, journaux et synchronisation.',
    saveAll: 'Tout Enregistrer',
    savedNotice: 'Paramètres appliqués avec succès.',
    themeSection: 'Thème et Apparence',
    themeCurrent: 'Thème Actuel',
    themeBlack: 'Noir (AMOLED)',
    themeDark: 'Sombre',
    themeMidnight: 'Minuit',
    themeEmerald: 'Émeraude',
    themePink: 'Rose',
    notifSection: 'Notifications Flottantes & Position',
    testPopup: 'Tester la Notification',
    testSound: 'Tester le Son',
    cornerPlacement: 'Position sur l’Écran',
    cornerBR: 'Bas Droite',
    cornerBL: 'Bas Gauche',
    cornerTR: 'Haut Droite',
    cornerTL: 'Haut Gauche',
    overlayToggle: 'Superposition Flottante au-dessus des Jeux',
    overlayToggleDesc: 'Afficher des notifications flottantes par-dessus les jeux plein écran et VRChat.',
    soundAlertsToggle: 'Alerte Sonore lors d’une Entrée ou Changement de Monde',
    soundAlertsDesc: 'Jouer un son lorsqu’un ami rejoint ou change de monde.',
    startupSection: 'Démarrage Windows et Barre des Tâches',
    startWithWindows: 'Démarrer avec Windows',
    startWithWindowsDesc: 'Lancer automatiquement en arrière-plan au démarrage du PC.',
    minimizeToTray: 'Réduire dans la Barre des Tâches',
    minimizeToTrayDesc: 'Continuer de fonctionner en arrière-plan à la fermeture de la fenêtre.',
    logsSection: 'Journaux de Jeu et Radar',
    logDir: 'Répertoire des Journaux VRChat',
    browse: 'Parcourir',
    enableLogWatcher: 'Activer l’Observateur de Journaux',
    enableLogWatcherDesc: 'Détecte les entrées, sorties et instances en temps réel.',
    syncSection: 'Synchronisation en Arrière-plan',
    autoRefresh: 'Actualisation Automatique des Amis',
    autoRefreshDesc: 'Récupère automatiquement les statuts et emplacements depuis VRChat.',
    refreshInterval: 'Intervalle d’Actualisation',
    languageSection: 'Langue et Traduction',
    languageLabel: 'Langue de l’Application',
    openUserManual: 'Ouvrir le Manuel Utilisateur',

    welcomeTitle: 'Bienvenue sur VRCFX',
    welcomeSubtitle: 'Votre compagnon haute performance pour VRChat.',
    step1Title: 'Gestion des Amis et Groupes Favoris',
    step1Desc: 'Organisez vos favoris, suivez les anciens pseudos, ajoutez des notes et voyez les emplacements en direct.',
    step2Title: 'Superposition Flotante au-dessus des Jeux',
    step2Desc: 'Recevez des alertes qui flottent au-dessus de VRChat et de vos jeux plein écran.',
    step3Title: 'Radar en Direct et Suivi de Salle',
    step3Desc: 'Détection en temps réel de qui entre et sort de votre instance.',
    step4Title: 'Démarrage Automatique et Arrière-Plan',
    step4Desc: 'Fonctionne discrètement en arrière-plan sans interrompre vos sessions de jeu.',
    getStarted: 'Commencer avec VRCFX',
    next: 'Suivant',
    back: 'Retour',
    close: 'Fermer',

    cleanerTitle: 'Nettoyeur d’Amis Inactifs',
    cleanerDesc: 'Identifiez les amis inactifs depuis des mois et nettoyez votre liste en toute simplicité.',
    deleteSelected: 'Supprimer les Amis Sélectionnés',
    selectAll: 'Tout Sélectionner',
    deselectAll: 'Tout Désélectionner'
  }
}
