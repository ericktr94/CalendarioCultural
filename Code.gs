// En un proyecto real de Google Apps Script, este archivo se llamaría "Code.gs"

// Declarations for Google Apps Script Global Objects
declare const HtmlService: any;
declare const DriveApp: any;
declare const Utilities: any;
declare const Logger: any;
declare const CalendarApp: any;
declare const PropertiesService: any;
declare const Session: any;
declare const SpreadsheetApp: any;
declare const LockService: any;

// --- Claves para PropertiesService ---
/**
 * @const {Object<string, string>} SCRIPT_PROPERTIES
 * @description Contiene las claves utilizadas para acceder a las propiedades del script almacenadas en PropertiesService.
 * @property {string} DRIVE_FOLDER_ID - Clave para el ID de la carpeta de Google Drive.
 * @property {string} ADMIN_EMAILS - Clave para la lista de correos de administradores.
 * @property {string} SPREADSHEET_ID - Clave para el ID de la Hoja de Cálculo de Google.
 * @property {string} SHEET_NAME - Clave para el nombre de la hoja específica dentro de la Hoja de Cálculo.
 */
const SCRIPT_PROPERTIES = {
  DRIVE_FOLDER_ID: 'DRIVE_FOLDER_ID',
  ADMIN_EMAILS: 'ADMIN_EMAILS',
  SPREADSHEET_ID: 'SPREADSHEET_ID',
  SHEET_NAME: 'SHEET_NAME'
};

// --- Cabeceras de la Hoja de Cálculo (El orden es importante y debe coincidir con la hoja) ---
/**
 * @const {string[]} EVENT_SHEET_HEADERS
 * @description Define el orden y los nombres de las columnas en la Hoja de Cálculo de eventos.
 * Este array es crucial para mapear correctamente los datos entre objetos Evento y filas de la hoja.
 */
const EVENT_SHEET_HEADERS = [
  'id', 'name', 'date', 'startTime', 'endTime', 'venue', 'responsibleArea',
  'activityType', 'specificActivity', 'photoCoverage', 'designNeeded', 'notes',
  'status', 'designFileUrl', 'requesterEmail', 'requesterName', 'createdAt',
  'approvedBy', 'approvedAt', 'cancelledBy', 'cancelledAt', 'deletedBy', 'deletedAt',
  'calendarEventId'
];

// --- Funciones Auxiliares para PropertiesService ---

/**
 * Obtiene una propiedad del script desde PropertiesService.
 * @param {string} key La clave de la propiedad a obtener.
 * @return {string|null} El valor de la propiedad o null si no se encuentra.
 */
function _getScriptProperty(key: string): string | null {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/**
 * Establece una propiedad del script en PropertiesService.
 * Esta función es útil para la configuración inicial del script y no se espera
 * que se llame durante el flujo normal de la aplicación.
 * @param {string} key La clave de la propiedad a establecer.
 * @param {string} value El valor de la propiedad.
 */
function _setScriptProperty(key: string, value: string): void {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

/**
 * Función para configurar las propiedades iniciales del script.
 * Debe ejecutarse manualmente desde el editor de Apps Script una vez para
 * inicializar la configuración necesaria como IDs de carpetas, hojas de cálculo y
 * listas de administradores.
 * Es crucial reemplazar los valores placeholder con los valores reales.
 */
function _setupInitialProperties() {
  // IMPORTANTE: Reemplaza 'YOUR_DRIVE_FOLDER_ID_HERE' con el ID real de tu carpeta de Google Drive.
  _setScriptProperty(SCRIPT_PROPERTIES.DRIVE_FOLDER_ID, 'YOUR_DRIVE_FOLDER_ID_HERE');
  // IMPORTANTE: Reemplaza con una lista de correos de administradores, separados por comas. Ej: 'usuario1@dominio.com,usuario2@dominio.com'
  _setScriptProperty(SCRIPT_PROPERTIES.ADMIN_EMAILS, 'admin1@example.com,admin2@example.com');
  // IMPORTANTE: Reemplaza 'YOUR_SPREADSHEET_ID_HERE' con el ID real de tu Hoja de Cálculo de Google.
  _setScriptProperty(SCRIPT_PROPERTIES.SPREADSHEET_ID, 'YOUR_SPREADSHEET_ID_HERE');
  // Nombre de la hoja dentro de la Hoja de Cálculo donde se almacenarán los datos de los eventos.
  _setScriptProperty(SCRIPT_PROPERTIES.SHEET_NAME, 'EventosDB');
  Logger.log('Propiedades iniciales configuradas. Asegúrate de reemplazar los valores placeholder y crear la Hoja de Cálculo con las cabeceras correctas si aún no existe.');
}

/**
 * Obtiene el ID de la carpeta de Google Drive donde se guardarán los archivos adjuntos.
 * Lee el ID desde PropertiesService.
 * @return {string} El ID de la carpeta de Drive.
 * @throws {Error} Si el ID de la carpeta de Drive no está configurado en Script Properties.
 */
function _getDriveFolderId(): string {
  const folderId = _getScriptProperty(SCRIPT_PROPERTIES.DRIVE_FOLDER_ID);
  if (!folderId || folderId === 'YOUR_DRIVE_FOLDER_ID_HERE' || folderId.trim() === "") {
    Logger.log("Error Crítico: El ID de la carpeta de Drive no está configurado en Script Properties.");
    throw new Error('El ID de la carpeta de Drive no está configurado en Script Properties.');
  }
  return folderId;
}

/**
 * Obtiene la lista de correos electrónicos de los administradores.
 * Lee la lista desde PropertiesService (espera una cadena de emails separados por comas).
 * @return {string[]} Un array de strings, donde cada string es un correo de administrador en minúsculas.
 *                    Retorna un array vacío si no hay emails configurados o la propiedad está vacía.
 */
function _getAdminEmails(): string[] {
  const emailsStr = _getScriptProperty(SCRIPT_PROPERTIES.ADMIN_EMAILS);
  if (!emailsStr || emailsStr.trim() === "") {
    Logger.log('Advertencia: No hay correos de administradores configurados en Script Properties. Ningún usuario será reconocido como administrador.');
    return [];
  }
  return emailsStr.split(',').map(email => email.trim().toLowerCase());
}

/**
 * Obtiene el ID de la Hoja de Cálculo de Google donde se almacenan los eventos.
 * @return {string} El ID de la Hoja de Cálculo.
 * @throws {Error} Si el ID de la Hoja de Cálculo no está configurado en Script Properties.
 */
function _getSpreadsheetId(): string {
  const id = _getScriptProperty(SCRIPT_PROPERTIES.SPREADSHEET_ID);
  if (!id || id === 'YOUR_SPREADSHEET_ID_HERE' || id.trim() === "") {
    Logger.log("Error Crítico: El ID de la Hoja de Cálculo no está configurado en Script Properties.");
    throw new Error('El ID de la Hoja de Cálculo no está configurado en Script Properties.');
  }
  return id;
}

/**
 * Obtiene el nombre de la hoja específica (pestaña) dentro de la Hoja de Cálculo donde se guardan los eventos.
 * @return {string} El nombre de la hoja.
 * @throws {Error} Si el nombre de la hoja no está configurado en Script Properties.
 */
function _getSheetName(): string {
  const name = _getScriptProperty(SCRIPT_PROPERTIES.SHEET_NAME);
  if (!name || name.trim() === "") {
    Logger.log("Error Crítico: El nombre de la Hoja de Eventos no está configurado en Script Properties.");
    throw new Error('El nombre de la Hoja de Eventos no está configurado en Script Properties.');
  }
  return name;
}

// --- Lógica de Usuario y Roles ---

/**
 * Verifica si el correo electrónico proporcionado pertenece a un usuario administrador.
 * Compara el email (en minúsculas y sin espacios extra) con la lista de emails de administradores.
 * @param {string} email El correo electrónico a verificar.
 * @return {boolean} True si el email corresponde a un administrador, false en caso contrario o si el email es nulo/vacío.
 */
function _isUserAdmin(email: string): boolean {
  if (!email || email.trim() === "") return false;
  const adminEmails = _getAdminEmails();
  return adminEmails.includes(email.trim().toLowerCase());
}

/**
 * Obtiene la información del usuario activo que interactúa con el script.
 * Incluye el email, el nombre de usuario (si está disponible, sino la parte local del email) y si es administrador.
 * @return {{email: string, isAdmin: boolean, name: string}} Un objeto con la información del usuario:
 * - `email`: Email del usuario activo.
 * - `isAdmin`: Booleano indicando si es administrador.
 * - `name`: Nombre de usuario (o parte local del email si el nombre no está disponible o es igual al email).
 */
function _getUserInfo(): { email: string; isAdmin: boolean; name: string } {
  const activeUser = Session.getActiveUser();
  const activeUserEmail = activeUser.getEmail();
  const activeUserName = activeUser.getUsername();

  let displayName = activeUserEmail.split('@')[0]; // Default a parte local del email
  if (activeUserName && activeUserName !== activeUserEmail) {
    displayName = activeUserName; // Usar username si es diferente del email
  }

  return {
    email: activeUserEmail,
    isAdmin: _isUserAdmin(activeUserEmail),
    name: displayName
  };
}


// --- CONFIGURACIÓN Y CONSTANTES (Listas predefinidas para dropdowns en el frontend) ---
/** @const {string[]} Lista de áreas responsables para eventos. */
const AREAS_RESPONSABLES = [
  "Dirección Cultural", "Dirección de Planeación", "Dirección de Patrimonio Cultural",
  "Dirección Jurídica", "Dirección de Promoción y Difusión", "Dirección de Administración",
  "DGSCPP", "DCyEC", "DFFME", "DRH", "DCyR",
  "La Biblioteca Pública Estatal “Solón Argüello”", "Orquesta de Cámara de Nayarit",
  "V. La Escuela Superior de Música", "VI. La Escuela de Música Siglo XXI", "VII. Museo “Juan Escutia”",
  "VIII. Museo “Amado Nervo”", "IX. El Museo del Origen de Mexcaltitán",
  "XI. La Escuela Estatal de Bellas Artes", "XIII. Ballet Nuevo Nayarit", "XIV. Grupo de Danza “Nayar”",
  "XVI. El Centro de Arte Contemporáneo “Emilia Ortiz”", "XVIII. Museo de los Cinco Pueblos",
  "XIX. Centro Cultural en Bellavista", "XXII. Centro de Educación Artística de Bachillerato de Artes y Humanidades Amado Nervo CEDART",
  "XXIII. Programa de Desarrollo Cultura Infantil", "XXV. Programa de Fomento a la Lectura y Literatura",
  "PACMyC", "PECDA", "AIEC", "FONART"
];
/** @const {Object<string, string[]>} Mapa de tipos de actividad, agrupados por categoría. */
const ACTIVITY_TYPES = {
  "Festivales y eventos masivos": ["Ferias del libro", "Conciertos", "Carnavales"],
  "Talleres y formación artística": ["Música", "Danza", "Teatro", "Artes plásticas"],
  "Fomento a la lectura": ["Presentaciones de libros", "Círculos de lectura"],
  "Apoyo a creadores": ["Becas", "Residencias artísticas", "Convocatorias"],
  "Patrimonio cultural": ["Restauración", "Tradiciones", "Artesanías"],
  "Actividades infantiles y juveniles": ["Teatro infantil", "Talleres"],
  "Cine y medios audiovisuales": ["Festivales de cine", "Talleres de cine"],
  "Cultura digital": ["Arte interactivo", "Talleres de tecnología"],
  "Inclusión y diversidad": ["Programas para comunidades indígenas", "LGBTQ+"],
  "Giras e intercambios culturales": ["Eventos itinerantes"],
  "Otro": ["Actividades no clasificadas"]
};

// --- Interfaz de Evento (Define la estructura de un objeto Evento) ---
/**
 * Representa la estructura de un evento.
 * @typedef {Object} Event
 * @property {string} id - Identificador único del evento (UUID).
 * @property {string} name - Nombre o título del evento.
 * @property {string} date - Fecha del evento en formato YYYY-MM-DD.
 * @property {string} startTime - Hora de inicio del evento en formato HH:MM.
 * @property {string} endTime - Hora de fin del evento en formato HH:MM.
 * @property {string} venue - Lugar de realización del evento.
 * @property {string} responsibleArea - Área o departamento responsable del evento.
 * @property {string} [activityType] - Tipo de actividad específica (ej. "Conciertos", "Talleres de música").
 * @property {string} [specificActivity] - (Este campo parece redundante si activityType es específico, considerar unificar o clarificar su uso).
 * @property {string} photoCoverage - Indica si se requiere cobertura fotográfica ("Sí" o "No").
 * @property {string} designNeeded - Indica si se requiere diseño gráfico ("Sí" o "No").
 * @property {string} [notes] - Notas o descripción adicional sobre el evento.
 * @property {'Pendiente' | 'Aprobado' | 'Cancelado' | 'Eliminado'} status - Estado base del evento persistido en la hoja.
 * @property {string | null} designFileUrl - URL al archivo de diseño adjunto en Google Drive, o null si no hay.
 * @property {string} [requesterEmail] - Email del usuario que registró el evento.
 * @property {string} [requesterName] - Nombre del usuario que registró el evento.
 * @property {string} [createdAt] - Timestamp ISO8601 de cuándo se registró el evento.
 * @property {string} [approvedBy] - Email del administrador que aprobó el evento.
 * @property {string} [approvedAt] - Timestamp ISO8601 de cuándo se aprobó el evento.
 * @property {string} [cancelledBy] - Email del administrador que canceló el evento.
 * @property {string} [cancelledAt] - Timestamp ISO8601 de cuándo se canceló el evento.
 * @property {string} [deletedBy] - Email del administrador que eliminó (soft delete) el evento.
 * @property {string} [deletedAt] - Timestamp ISO8601 de cuándo se eliminó (soft delete) el evento.
 * @property {string} [calendarEventId] - ID del evento creado en Google Calendar.
 * @property {string} [computedStatus] - Estado calculado para visualización en el frontend (ej. "Pasado", "SemanaActual", "Conflicto").
 * @property {any} [key: string] - Permite otras propiedades que puedan venir del formulario pero no se persisten directamente o son parte de la estructura flexible.
 */
interface Event {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  responsibleArea: string;
  activityType?: string;
  specificActivity?: string;
  photoCoverage: string;
  designNeeded: string;
  notes?: string;
  status: 'Pendiente' | 'Aprobado' | 'Cancelado' | 'Eliminado' | 'Pasado' | 'SemanaActual' | 'Conflicto';
  designFileUrl: string | null;
  requesterEmail?: string;
  requesterName?: string;
  createdAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  deletedBy?: string;
  deletedAt?: string;
  calendarEventId?: string;
  computedStatus?: string;
  [key: string]: any;
}

// --- Funciones Auxiliares para Google Sheets ---

/**
 * Obtiene la hoja de cálculo de eventos.
 * Si la hoja no existe en la Hoja de Cálculo especificada, la crea y añade las cabeceras.
 * Si la hoja existe pero no tiene cabeceras, las añade.
 * @return {GoogleAppsScript.Spreadsheet.Sheet} El objeto Sheet para interactuar con la hoja de eventos.
 * @throws {Error} Si no se puede acceder o crear la hoja.
 */
function _getSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheetId = _getSpreadsheetId(); // Lanza error si no está configurado
  const sheetName = _getSheetName(); // Lanza error si no está configurado
  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Asegurar que la hoja tenga al menos una fila para las cabeceras y columnas suficientes
    if (sheet.getMaxColumns() < EVENT_SHEET_HEADERS.length) {
        sheet.insertColumns(1, EVENT_SHEET_HEADERS.length - sheet.getMaxColumns());
    }
    sheet.getRange(1, 1, 1, EVENT_SHEET_HEADERS.length).setValues([EVENT_SHEET_HEADERS]);
    Logger.log(`Hoja "${sheetName}" creada con cabeceras.`);
  } else {
    const firstRow = sheet.getRange(1, 1, 1, EVENT_SHEET_HEADERS.length).getValues()[0];
    const headersMatch = EVENT_SHEET_HEADERS.every((header, index) => header === firstRow[index]);
    if (!headersMatch || firstRow.join("").trim() === "") { // Si no hay cabeceras o están incorrectas
        Logger.log(`Cabeceras no encontradas o incorrectas en la hoja "${sheetName}". Recreándolas.`);
        sheet.clearContents(); // Limpiar contenido existente si las cabeceras no son correctas
        if (sheet.getMaxColumns() < EVENT_SHEET_HEADERS.length) {
            sheet.insertColumns(1, EVENT_SHEET_HEADERS.length - sheet.getMaxColumns());
        }
        sheet.getRange(1, 1, 1, EVENT_SHEET_HEADERS.length).setValues([EVENT_SHEET_HEADERS]);
        Logger.log(`Cabeceras recreadas en la hoja "${sheetName}".`);
    }
  }
  return sheet;
}

/**
 * Convierte un objeto Evento a un array para ser insertado como una fila en la hoja de cálculo.
 * El orden de los valores en el array corresponde al orden definido en `EVENT_SHEET_HEADERS`.
 * @param {Event} obj El objeto evento a convertir.
 * @return {any[]} Un array con los valores del evento, listos para `appendRow` o `setValues`.
 *                 Los valores undefined se convierten a strings vacíos.
 */
function _eventToRow(obj: Event): any[] {
  return EVENT_SHEET_HEADERS.map(header => obj[header] !== undefined ? obj[header] : "");
}

/**
 * Convierte una fila de la hoja de cálculo (array de valores) a un objeto Evento.
 * @param {any[]} row El array de valores de la fila.
 * @param {string[]} headers El array de cabeceras de la hoja, usado para mapear los valores a propiedades del objeto.
 * @return {Event} Un objeto evento poblado con los datos de la fila.
 */
function _rowToEvent(row: any[], headers: string[]): Event {
  const obj: Partial<Event> = {};
  headers.forEach((header, i) => {
    obj[header] = row[i];
  });
  return obj as Event;
}

/**
 * Encuentra el índice de la fila (basado en 1) de un evento en la hoja de cálculo, buscando por su ID.
 * @param {string} eventId El ID del evento a buscar.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet La hoja de cálculo donde buscar.
 * @param {string[]} headers Las cabeceras de la hoja (para encontrar la columna 'id').
 * @param {any[][]} [allValues] Opcional. Un array 2D con todos los valores de la hoja (incluyendo cabeceras).
 *                              Si se proporciona, se usa para optimizar y evitar leer de nuevo la hoja.
 * @return {number} El índice de la fila (basado en 1) donde se encontró el evento. Retorna -1 si no se encuentra.
 * @throws {Error} Si la columna 'id' no se encuentra en las cabeceras.
 */
function _findEventRowIndex(eventId: string, sheet: GoogleAppsScript.Spreadsheet.Sheet, headers: string[], allValues?: any[][]): number {
  const valuesToSearch = allValues || sheet.getDataRange().getValues();
  const idColIndex = headers.indexOf('id');
  if (idColIndex === -1) {
      Logger.log("Error crítico en _findEventRowIndex: La columna 'id' no existe en las cabeceras proporcionadas.");
      throw new Error("La columna 'id' no se encuentra en las cabeceras de la hoja.");
  }

  for (let i = 1; i < valuesToSearch.length; i++) { // Empezar en 1 para saltar la fila de cabeceras
    if (valuesToSearch[i][idColIndex] === eventId) {
      return i + 1; // El índice de fila en Google Sheets es basado en 1
    }
  }
  return -1; // No encontrado
}

// --- PUNTO DE ENTRADA DE LA APLICACIÓN WEB ---
/**
 * Función principal que se ejecuta cuando un usuario accede a la URL de la aplicación web.
 * Sirve el archivo HTML principal de la interfaz de usuario.
 * @return {HtmlOutput} El objeto HtmlOutput que representa la página web a mostrar.
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index') // Asume que el HTML se llama 'Index.html'
    .evaluate()
    .setTitle('Gestión de Eventos CECAN')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

// --- FUNCIONES EXPUESTAS AL CLIENTE (google.script.run) ---

/**
 * Obtiene datos iniciales necesarios para el frontend.
 * Esto incluye las listas de áreas responsables, tipos de actividad y la información del usuario actual.
 * @return {{AREAS_RESPONSABLES: string[], ACTIVITY_TYPES: Object<string, string[]>, userInfo: {email: string, isAdmin: boolean, name: string}}}
 *         Un objeto que contiene:
 *         - `AREAS_RESPONSABLES`: Array de strings con las áreas.
 *         - `ACTIVITY_TYPES`: Objeto con los tipos de actividad agrupados.
 *         - `userInfo`: Información del usuario activo (email, nombre, si es admin).
 */
function getInitialData() {
  try {
    return {
      AREAS_RESPONSABLES,
      ACTIVITY_TYPES,
      userInfo: _getUserInfo()
    };
  } catch (e: any) {
    Logger.log(`Error en getInitialData: ${e.toString()} ${e.stack}`);
    // Relanzar el error para que el frontend lo maneje
    throw new Error(`Error al obtener datos iniciales: ${e.message}`);
  }
}

/**
 * Obtiene una lista paginada de eventos desde Google Sheets.
 * Los eventos marcados como 'Eliminado' son excluidos.
 * Los eventos se ordenan por fecha (más reciente primero) y luego por hora de inicio.
 * @param {{page?: number, limit?: number}} [options={page:1, limit:10}] Opciones de paginación.
 * @param {number} [options.page=1] El número de página a obtener (basado en 1).
 * @param {number} [options.limit=10] El número de eventos por página.
 * @return {{data: Event[], total: number}} Un objeto con:
 *         - `data`: Un array de objetos {@link Event} para la página solicitada, con su `computedStatus`.
 *         - `total`: El número total de eventos activos (no eliminados).
 * @throws {Error} Si ocurre un problema al leer o procesar los datos de la hoja.
 */
function getEvents(options: { page?: number; limit?: number } = {}): { data: Event[]; total: number } {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000); // Esperar hasta 15 segundos por el bloqueo

  try {
    const sheet = _getSheet();
    const sheetValues = sheet.getDataRange().getValues();
    // Si la hoja está vacía o solo tiene cabeceras, no hay eventos.
    if (sheetValues.length <= 1) return { data: [], total: 0 };

    const headers = sheetValues[0] as string[]; // Primera fila son cabeceras
    const allDbEvents: Event[] = sheetValues.slice(1) // Omitir cabeceras
        .map(row => _rowToEvent(row, headers))
        .filter(event => event.id && event.status !== 'Eliminado'); // Asegurar que tenga ID y no esté eliminado

    // Ordenar eventos: por fecha (más reciente primero), luego por hora de inicio (más temprana primero)
    const sortedEvents = [...allDbEvents].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateB - dateA; // Descendente para fecha

        // Para la misma fecha, ordenar por hora de inicio ascendente
        const timeA = new Date(`1970-01-01T${a.startTime || '00:00'}`).getTime();
        const timeB = new Date(`1970-01-01T${b.startTime || '00:00'}`).getTime();
        return timeA - timeB; // Ascendente para hora
    });

    const { page = 1, limit = 10 } = options;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedEvents = sortedEvents.slice(startIndex, endIndex);

    // Pasar todos los eventos activos de la BD a computeStatus para una correcta lógica de conflicto.
    return {
        data: paginatedEvents.map(event => computeStatus(event, allDbEvents)),
        total: allDbEvents.length
    };
  } catch (e: any) {
    Logger.log(`Error en getEvents: ${e.toString()} ${e.stack}`);
    throw new Error(`No se pudieron obtener los eventos desde la hoja de cálculo: ${e.message}`);
  } finally {
    if (lock) lock.releaseLock();
  }
}

/**
 * Registra un nuevo evento en la Hoja de Cálculo de Google.
 * Sube un archivo adjunto a Google Drive si se proporciona.
 * @param {object} data Objeto con los datos del evento enviados desde el formulario del frontend.
 *                      Debe incluir propiedades que coincidan con la interfaz {@link Event}.
 *                      Puede incluir `data.designFile` con {name, mimeType, bytes (base64)} para el archivo.
 * @return {string} Mensaje de éxito indicando que el evento fue registrado.
 * @throws {Error} Si ocurre un error durante el registro, subida de archivo, o acceso a la hoja/carpeta.
 */
function addEvent(data: any): string {
  const userInfo = _getUserInfo();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // Esperar hasta 30 segundos para obtener el bloqueo de escritura

  try {
    const sheet = _getSheet();
    // Usar las cabeceras definidas globalmente asegura consistencia
    const headers = EVENT_SHEET_HEADERS;

    const newId = Utilities.getUuid(); // Generar ID único universal
    let designFileUrl: string | null = null;

    // Procesar archivo adjunto si existe y tiene los datos necesarios
    if (data.designFile && data.designFile.bytes && data.designFile.name && data.designFile.mimeType) {
        const fileBlob = Utilities.newBlob(Utilities.base64Decode(data.designFile.bytes), data.designFile.mimeType, data.designFile.name);
        const folderId = _getDriveFolderId(); // Obtener ID de carpeta desde propiedades
        const folder = DriveApp.getFolderById(folderId);
        const file = folder.createFile(fileBlob);
        designFileUrl = file.getUrl();
        Logger.log(`Archivo ${file.getName()} subido a Drive para evento ${newId}. URL: ${designFileUrl}`);
    }

    const newEvent: Event = {
        id: newId,
        name: data.name || "Evento sin nombre", // Valor por defecto si falta
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        venue: data.venue || "Lugar no especificado",
        responsibleArea: data.responsibleArea,
        activityType: data.activityType,
        specificActivity: data.specificActivity || "", // Campo opcional
        photoCoverage: data.photoCoverage || "No",
        designNeeded: data.designNeeded || "No",
        notes: data.notes || "",
        status: 'Pendiente', // Estado inicial por defecto
        designFileUrl: designFileUrl,
        requesterEmail: userInfo.email,
        requesterName: userInfo.name,
        createdAt: new Date().toISOString(),
        // Inicializar campos de auditoría vacíos
        approvedBy: "", approvedAt: "",
        cancelledBy: "", cancelledAt: "",
        deletedBy: "", deletedAt: "",
        calendarEventId: ""
    };

    const rowData = _eventToRow(newEvent); // Usar la función auxiliar que ya conoce las cabeceras
    sheet.appendRow(rowData);

    Logger.log(`Evento añadido a Sheet: ${newEvent.name} (ID: ${newId}) por ${userInfo.email}`);
    return `Evento "${newEvent.name}" registrado con éxito.`;

  } catch(e: any) {
    Logger.log(`Error en addEvent (Sheet) por ${userInfo.email}: ${e.toString()} ${e.stack}`);
    // Propagar errores de configuración de forma clara
    if (e.message.includes("ID de la carpeta de Drive no está configurado") ||
        e.message.includes("ID de la Hoja de Cálculo no está configurado") ||
        e.message.includes("nombre de la Hoja de Eventos no está configurado")) {
        throw new Error(`Error de configuración del script: ${e.message}`);
    }
    throw new Error(`No se pudo registrar el evento en la hoja de cálculo: ${e.message}`);
  } finally {
    if (lock) lock.releaseLock();
  }
}

/**
 * Aprueba un evento específico en Google Sheets y crea una entrada en Google Calendar.
 * Esta acción solo puede ser realizada por un administrador.
 * @param {string} eventId El ID del evento a aprobar.
 * @return {string} Mensaje de éxito indicando que el evento fue aprobado y añadido al calendario (o si falló el calendario).
 * @throws {Error} Si el usuario no es administrador, el evento no se encuentra, ya está eliminado/aprobado,
 *                 o si hay un conflicto de horario con otro evento aprobado.
 *                 También puede lanzar error si falla la actualización de la hoja.
 */
function approveEvent(eventId: string): string {
  const userInfo = _getUserInfo();
  if (!userInfo.isAdmin) {
    Logger.log(`Intento no autorizado de aprobar evento ID ${eventId} por ${userInfo.email}`);
    throw new Error('Acción no autorizada: No tiene permisos para aprobar eventos.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // Esperar por el bloqueo

  try {
    const sheet = _getSheet();
    const allSheetValues = sheet.getDataRange().getValues();
    const headers = allSheetValues[0] as string[]; // Asumir que la primera fila son cabeceras

    const eventRowIndex = _findEventRowIndex(eventId, sheet, headers, allSheetValues);
    if (eventRowIndex === -1) {
      throw new Error(`Evento con ID ${eventId} no encontrado en la hoja.`);
    }

    const eventDataRow = allSheetValues[eventRowIndex -1]; // -1 porque eventRowIndex es basado en 1
    const event = _rowToEvent(eventDataRow, headers);

    if (event.status === 'Eliminado') throw new Error(`El evento "${event.name}" (ID: ${eventId}) fue eliminado y no puede ser modificado.`);
    if (event.status === 'Aprobado') return `El evento "${event.name}" (ID: ${eventId}) ya estaba aprobado.`;

    // Lógica de conflicto antes de aprobar
    const allDbEvents: Event[] = allSheetValues.slice(1).map(row => _rowToEvent(row, headers));
    const conflictingEvent = allDbEvents.find(otherEvent => {
        if (event.id === otherEvent.id || otherEvent.status !== 'Aprobado') return false;
        if (event.date !== otherEvent.date) return false;

        const eventStart = new Date(`${event.date}T${event.startTime}`).getTime();
        const eventEnd = new Date(`${event.date}T${event.endTime}`).getTime();
        const otherStart = new Date(`${otherEvent.date}T${otherEvent.startTime}`).getTime();
        const otherEnd = new Date(`${otherEvent.date}T${otherEvent.endTime}`).getTime();

        if (eventStart < otherEnd && eventEnd > otherStart) return true; // Solapamiento directo
        // Regla de 5 horas (aproximadamente, ya que no considera duración, solo inicio/fin)
        if (Math.abs(eventStart - otherEnd) < (5 * 60 * 60 * 1000) && eventStart > otherEnd) return true;
        if (Math.abs(otherStart - eventEnd) < (5 * 60 * 60 * 1000) && otherStart > eventEnd) return true;
        return false;
    });

    if (conflictingEvent) {
      Logger.log(`Conflicto al intentar aprobar evento ID ${eventId}. Conflicto con ID ${conflictingEvent.id} ("${conflictingEvent.name}").`);
      throw new Error(`No se puede aprobar. El evento "${event.name}" tiene un conflicto de horario con el evento aprobado "${conflictingEvent.name}".`);
    }

    let newCalendarEventId = event.calendarEventId || "";
    let calendarMessagePart = "";
    try {
        const calendar = CalendarApp.getDefaultCalendar(); // Podría ser configurable
        const startTime = new Date(`${event.date}T${event.startTime}`);
        const endTime = new Date(`${event.date}T${event.endTime}`);
        const calEvent = calendar.createEvent(event.name, startTime, endTime, {
            location: event.venue,
            description: `Área Responsable: ${event.responsibleArea}\nNotas: ${event.notes}\nRegistrado por: ${event.requesterName} (${event.requesterEmail})`
        });
        newCalendarEventId = calEvent.getId();
        calendarMessagePart = " y añadido al calendario";
        Logger.log(`Evento ID ${eventId} (${event.name}) añadido al calendario. ID Calendario: ${newCalendarEventId}`);
    } catch(e: any) {
        Logger.log(`Error al crear evento en calendario para ID ${eventId} ("${event.name}"): ${e.toString()}. El evento será aprobado en el sistema igualmente.`);
        calendarMessagePart = " (pero falló la creación en calendario, contactar soporte)";
    }

    // Actualizar la fila en la hoja
    const statusCol = headers.indexOf('status') + 1;
    const approvedByCol = headers.indexOf('approvedBy') + 1;
    const approvedAtCol = headers.indexOf('approvedAt') + 1;
    const calendarIdCol = headers.indexOf('calendarEventId') + 1;

    // Validar que las columnas existan para evitar errores de rango
    if (!statusCol || !approvedByCol || !approvedAtCol || !calendarIdCol) {
        Logger.log("Error crítico: Una o más columnas de auditoría no se encontraron en las cabeceras al aprobar.");
        throw new Error("Error interno del servidor: Faltan columnas de auditoría en la hoja.");
    }

    sheet.getRange(eventRowIndex, statusCol).setValue('Aprobado');
    sheet.getRange(eventRowIndex, approvedByCol).setValue(userInfo.email);
    sheet.getRange(eventRowIndex, approvedAtCol).setValue(new Date().toISOString());
    sheet.getRange(eventRowIndex, calendarIdCol).setValue(newCalendarEventId);

    Logger.log(`Evento ID ${eventId} (${event.name}) aprobado en Sheet por ${userInfo.email}.`);
    return `Evento "${event.name}" aprobado${calendarMessagePart}.`;

  } catch (e: any) {
    Logger.log(`Error en approveEvent (Sheet) ID ${eventId} por ${userInfo.email}: ${e.toString()} ${e.stack}`);
    throw new Error(`No se pudo aprobar el evento: ${e.message}`);
  } finally {
    if (lock) lock.releaseLock();
  }
}

/**
 * Cancela un evento específico en Google Sheets.
 * Si el evento estaba previamente aprobado y tenía una entrada en Google Calendar, esta se elimina.
 * Esta acción solo puede ser realizada por un administrador.
 * @param {string} eventId El ID del evento a cancelar.
 * @return {string} Mensaje de éxito indicando que el evento fue cancelado.
 * @throws {Error} Si el usuario no es administrador, el evento no se encuentra, o ya está eliminado/cancelado.
 *                 También puede lanzar error si falla la actualización de la hoja.
 */
function cancelEvent(eventId: string): string {
  const userInfo = _getUserInfo();
  if (!userInfo.isAdmin) {
    Logger.log(`Intento no autorizado de cancelar evento ID ${eventId} por ${userInfo.email}`);
    throw new Error('Acción no autorizada: No tiene permisos para cancelar eventos.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = _getSheet();
    const allSheetValues = sheet.getDataRange().getValues();
    const headers = allSheetValues[0] as string[];

    const eventRowIndex = _findEventRowIndex(eventId, sheet, headers, allSheetValues);
    if (eventRowIndex === -1) throw new Error(`Evento con ID ${eventId} no encontrado.`);

    const eventDataRow = allSheetValues[eventRowIndex - 1];
    const event = _rowToEvent(eventDataRow, headers);

    if (event.status === 'Eliminado') throw new Error(`El evento "${event.name}" (ID: ${eventId}) fue eliminado y no puede ser modificado.`);
    if (event.status === 'Cancelado') return `El evento "${event.name}" (ID: ${eventId}) ya estaba cancelado.`;

    const oldStatus = event.status;
    let oldCalendarId = event.calendarEventId;

    // Actualizar la fila en la hoja
    const statusCol = headers.indexOf('status') + 1;
    const cancelledByCol = headers.indexOf('cancelledBy') + 1;
    const cancelledAtCol = headers.indexOf('cancelledAt') + 1;
    const calendarIdCol = headers.indexOf('calendarEventId') + 1; // Para limpiar el ID

    if (!statusCol || !cancelledByCol || !cancelledAtCol || !calendarIdCol) {
        Logger.log("Error crítico: Una o más columnas de auditoría no se encontraron en las cabeceras al cancelar.");
        throw new Error("Error interno del servidor: Faltan columnas de auditoría en la hoja.");
    }

    sheet.getRange(eventRowIndex, statusCol).setValue('Cancelado');
    sheet.getRange(eventRowIndex, cancelledByCol).setValue(userInfo.email);
    sheet.getRange(eventRowIndex, cancelledAtCol).setValue(new Date().toISOString());
    sheet.getRange(eventRowIndex, calendarIdCol).setValue(""); // Limpiar el ID del evento de calendario

    // Si estaba aprobado y tenía evento en calendario, intentar eliminarlo
    if (oldStatus === 'Aprobado' && oldCalendarId) {
      try {
        const calendar = CalendarApp.getDefaultCalendar();
        const calendarEventToDelete = calendar.getEventById(oldCalendarId);
        if (calendarEventToDelete) {
            calendarEventToDelete.deleteEvent();
            Logger.log(`Evento de calendario ${oldCalendarId} eliminado para evento ID ${eventId} ("${event.name}") cancelado por ${userInfo.email}.`);
        }
      } catch (calError: any) {
        // No relanzar, la cancelación del evento en el sistema es lo principal. Registrar el error.
        Logger.log(`Error al eliminar evento de calendario ${oldCalendarId} para evento ID ${eventId} ("${event.name}"): ${calError.toString()}`);
      }
    }
    Logger.log(`Evento ID ${eventId} (${event.name}) cancelado en Sheet por ${userInfo.email}.`);
    return `Evento "${event.name}" cancelado.`;

  } catch (e: any) {
    Logger.log(`Error en cancelEvent (Sheet) ID ${eventId} por ${userInfo.email}: ${e.toString()} ${e.stack}`);
    throw new Error(`No se pudo cancelar el evento: ${e.message}`);
  } finally {
    if (lock) lock.releaseLock();
  }
}

/**
 * Marca un evento como 'Eliminado' (soft delete) en Google Sheets.
 * Si el evento estaba previamente aprobado y tenía una entrada en Google Calendar, esta se elimina.
 * Esta acción solo puede ser realizada por un administrador.
 * @param {string} eventId El ID del evento a eliminar.
 * @return {string} Mensaje de éxito indicando que el evento fue marcado como eliminado.
 * @throws {Error} Si el usuario no es administrador, el evento no se encuentra, o ya está eliminado.
 *                 También puede lanzar error si falla la actualización de la hoja.
 */
function deleteEvent(eventId: string): string {
  const userInfo = _getUserInfo();
  if (!userInfo.isAdmin) {
    Logger.log(`Intento no autorizado de eliminar evento ID ${eventId} por ${userInfo.email}`);
    throw new Error('Acción no autorizada: No tiene permisos para eliminar eventos.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = _getSheet();
    const allSheetValues = sheet.getDataRange().getValues();
    const headers = allSheetValues[0] as string[];

    const eventRowIndex = _findEventRowIndex(eventId, sheet, headers, allSheetValues);
    if (eventRowIndex === -1) throw new Error(`Evento con ID ${eventId} no encontrado.`);

    const eventDataRow = allSheetValues[eventRowIndex - 1];
    const event = _rowToEvent(eventDataRow, headers);

    if (event.status === 'Eliminado') return `El evento "${event.name}" (ID: ${eventId}) ya estaba eliminado.`;

    const oldStatus = event.status;
    let oldCalendarId = event.calendarEventId;

    // Actualizar la fila en la hoja
    const statusCol = headers.indexOf('status') + 1;
    const deletedByCol = headers.indexOf('deletedBy') + 1;
    const deletedAtCol = headers.indexOf('deletedAt') + 1;
    const calendarIdCol = headers.indexOf('calendarEventId') + 1; // Para limpiar el ID

    if (!statusCol || !deletedByCol || !deletedAtCol || !calendarIdCol) {
        Logger.log("Error crítico: Una o más columnas de auditoría no se encontraron en las cabeceras al eliminar.");
        throw new Error("Error interno del servidor: Faltan columnas de auditoría en la hoja.");
    }

    sheet.getRange(eventRowIndex, statusCol).setValue('Eliminado');
    sheet.getRange(eventRowIndex, deletedByCol).setValue(userInfo.email);
    sheet.getRange(eventRowIndex, deletedAtCol).setValue(new Date().toISOString());
    sheet.getRange(eventRowIndex, calendarIdCol).setValue(""); // Limpiar ID de calendario

    // Si estaba aprobado y tenía evento en calendario, intentar eliminarlo
    if (oldStatus === 'Aprobado' && oldCalendarId) {
      try {
        const calendar = CalendarApp.getDefaultCalendar();
        const calendarEventToDelete = calendar.getEventById(oldCalendarId);
        if (calendarEventToDelete) {
            calendarEventToDelete.deleteEvent();
            Logger.log(`Evento de calendario ${oldCalendarId} eliminado para evento ID ${eventId} ("${event.name}") marcado como eliminado por ${userInfo.email}.`);
        }
      } catch (calError: any) {
        Logger.log(`Error al eliminar evento de calendario ${oldCalendarId} para evento ID ${eventId} ("${event.name}") eliminado: ${calError.toString()}`);
      }
    }
    Logger.log(`Evento ID ${eventId} (${event.name}) marcado como eliminado en Sheet por ${userInfo.email}.`);
    return `Evento "${event.name}" eliminado.`;

  } catch (e: any) {
    Logger.log(`Error en deleteEvent (Sheet) ID ${eventId} por ${userInfo.email}: ${e.toString()} ${e.stack}`);
    throw new Error(`No se pudo eliminar el evento: ${e.message}`);
  } finally {
    if (lock) lock.releaseLock();
  }
}

// --- LÓGICA INTERNA DEL SERVIDOR (computeStatus) ---

/**
 * Calcula el estado dinámico de un evento para su visualización en el frontend.
 * Este estado (`computedStatus`) se basa en el estado persistido (`status`) del evento,
 * la fecha actual, y posibles conflictos con otros eventos aprobados.
 * Estados calculados incluyen: 'Pasado', 'SemanaActual', 'Conflicto'.
 * Si no aplica ninguno de estos, `computedStatus` será igual al `status` base.
 * @param {Event} event El objeto evento a procesar.
 * @param {Event[]} allActiveEventsFromSheet Un array de todos los eventos activos (no eliminados)
 *                                          leídos de la hoja de cálculo. Se usa para la detección de conflictos.
 * @return {Event} El objeto evento original, modificado para incluir la propiedad `computedStatus`.
 */
function computeStatus(event: Event, allActiveEventsFromSheet: Event[]): Event {
  // Crear una copia superficial para no modificar el objeto original directamente en este punto,
  // ya que 'event' podría ser parte de una lista que se está iterando.
  const eventWithComputedStatus = { ...event };

  // Si el estado base ya es final (Cancelado, Eliminado), ese es su computedStatus.
  if (eventWithComputedStatus.status === 'Cancelado' || eventWithComputedStatus.status === 'Eliminado') {
      eventWithComputedStatus.computedStatus = eventWithComputedStatus.status;
      return eventWithComputedStatus;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparaciones de día

  // Asegurar que event.date es un string válido antes de crear un objeto Date.
  // Si event.date no es válido, no se pueden hacer comparaciones de fecha.
  let eventDate: Date;
  try {
    // Interpretar la fecha YYYY-MM-DD como local.
    const parts = eventWithComputedStatus.date.split('-');
    eventDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    eventDate.setHours(0,0,0,0); // Normalizar también
    if (isNaN(eventDate.getTime())) throw new Error("Fecha inválida");
  } catch(e) {
    Logger.log(`Error al parsear fecha para evento ID ${eventWithComputedStatus.id}: ${eventWithComputedStatus.date}. Status: ${eventWithComputedStatus.status}`);
    // Si la fecha es inválida, no podemos calcular 'Pasado' o 'SemanaActual'.
    // Se podría asignar 'Conflicto' o mantener el status base.
    // Por ahora, se mantendrá el status base y se loguea el error.
    eventWithComputedStatus.computedStatus = eventWithComputedStatus.status;
    return eventWithComputedStatus;
  }


  // Si está Aprobado, su computedStatus primario es 'Aprobado' a menos que sea 'Pasado'.
  // La verificación de conflicto fuerte se hace ANTES de aprobar.
  // Un evento aprobado podría teóricamente entrar en conflicto si otro se aprueba después solapándose,
  // pero para la visualización, 'Aprobado' tiene precedencia sobre 'Conflicto' si ya está aprobado.
  if (eventWithComputedStatus.status === 'Aprobado') {
    if (eventDate.getTime() < now.getTime()) {
      eventWithComputedStatus.computedStatus = 'Pasado';
    } else {
      eventWithComputedStatus.computedStatus = 'Aprobado';
    }
    return eventWithComputedStatus;
  }

  // A partir de aquí, solo procesamos eventos con status 'Pendiente'.
  // Si por alguna razón llega aquí con otro status, se devuelve tal cual.
  if (eventWithComputedStatus.status !== 'Pendiente') {
      eventWithComputedStatus.computedStatus = eventWithComputedStatus.status;
      return eventWithComputedStatus;
  }

  // Si es Pendiente y la fecha ya pasó.
  if (eventDate.getTime() < now.getTime()) {
    eventWithComputedStatus.computedStatus = 'Pasado';
    return eventWithComputedStatus;
  }

  // Lógica para 'SemanaActual': Desde el lunes hasta el domingo de la semana actual.
  const todayForWeekCalc = new Date();
  const currentDayOfWeek = todayForWeekCalc.getDay(); // 0 (Domingo) a 6 (Sábado)
  // Calcular el lunes de esta semana
  const firstDayOfWeek = new Date(todayForWeekCalc);
  firstDayOfWeek.setDate(todayForWeekCalc.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1));
  firstDayOfWeek.setHours(0,0,0,0);

  // Calcular el domingo de esta semana
  const lastDayOfWeek = new Date(firstDayOfWeek);
  lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
  lastDayOfWeek.setHours(23,59,59,999); // Fin del día domingo

  // Función auxiliar para verificar conflictos (solo contra eventos APROBADOS)
  const checkConflict = (currentEvent: Event, approvedEvents: Event[]): boolean => {
    return approvedEvents.some(otherApprovedEvent => {
        // No comparar consigo mismo (aunque aquí currentEvent es Pendiente y otherApprovedEvent es Aprobado, así que no aplicaría)
        // if (currentEvent.id === otherApprovedEvent.id) return false; // No necesario por la diferencia de status
        if (currentEvent.date !== otherApprovedEvent.date) return false; // Solo mismo día

        const eventStart = new Date(`${currentEvent.date}T${currentEvent.startTime}`).getTime();
        const eventEnd = new Date(`${currentEvent.date}T${currentEvent.endTime}`).getTime();
        const otherStart = new Date(`${otherApprovedEvent.date}T${otherApprovedEvent.startTime}`).getTime();
        const otherEnd = new Date(`${otherApprovedEvent.date}T${otherApprovedEvent.endTime}`).getTime();

        // Solapamiento directo
        if (eventStart < otherEnd && eventEnd > otherStart) return true;
        // Regla de 5 horas
        if (Math.abs(eventStart - otherEnd) < (5 * 60 * 60 * 1000) && eventStart > otherEnd) return true;
        if (Math.abs(otherStart - eventEnd) < (5 * 60 * 60 * 1000) && otherStart > eventEnd) return true;
        return false;
    });
  };

  // Filtrar solo los eventos aprobados de la lista completa para la verificación de conflictos.
  const relevantApprovedEvents = allActiveEventsFromSheet.filter(e => e.id !== event.id && e.status === 'Aprobado');

  // Si es Pendiente y está en la Semana Actual
  if (eventDate.getTime() >= firstDayOfWeek.getTime() && eventDate.getTime() <= lastDayOfWeek.getTime()) {
    if (checkConflict(eventWithComputedStatus, relevantApprovedEvents)) {
        eventWithComputedStatus.computedStatus = 'Conflicto';
    } else {
        eventWithComputedStatus.computedStatus = 'SemanaActual';
    }
    return eventWithComputedStatus;
  }

  // Si es 'Pendiente' y no es Pasado ni SemanaActual, verificar Conflicto con eventos aprobados.
  if (checkConflict(eventWithComputedStatus, relevantApprovedEvents)) {
    eventWithComputedStatus.computedStatus = 'Conflicto';
    return eventWithComputedStatus;
  }

  // Si ninguna de las condiciones anteriores se cumple, el computedStatus es 'Pendiente'.
  eventWithComputedStatus.computedStatus = 'Pendiente';
  return eventWithComputedStatus;
}
