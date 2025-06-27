// ================== CONFIGURACIÓN AUTOMÁTICA ==================
var SPREADSHEET_ID = '';
var SHEET_NAME = 'Calendario Cultural CECAN';
var FOLDER_ID_MANUALES_DISENO = '';

function setupTodoDesdeCero() {
  // 1. Crear carpeta en Drive
  var folder = DriveApp.createFolder('Manuales de Diseño CECAN');
  FOLDER_ID_MANUALES_DISENO = folder.getId();

  // 2. Crear hoja de cálculo
  var ss = SpreadsheetApp.create('Calendario Cultural CECAN');
  SPREADSHEET_ID = ss.getId();
  var sheet = ss.getActiveSheet();
  sheet.setName(SHEET_NAME);

  // 3. Escribir encabezados
  var headers = [
    'ID Evento', 'Timestamp', 'Ultima fecha de verificación', 'Fecha Completa', 'Hora Inicio', 'Hora Fin',
    'Evento (Nombre/Título)', 'Notas', 'Tipo de Actividad', 'Lugar de Realización',
    'Area Responsable', 'Aprobación Jefe', 'Estado Interno', 'Cobertura Fotográfica', 'URL Manual de Diseño'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);

  // Mostrar los IDs en el log para referencia
  Logger.log('¡Listo! Se creó la hoja y la carpeta. El sistema ya está listo para usarse.');
  Logger.log('ID de la hoja de cálculo: ' + SPREADSHEET_ID);
  Logger.log('ID de la carpeta de Drive: ' + FOLDER_ID_MANUALES_DISENO);
}

// ================== VARIABLES Y MAPAS ==================
const CANONICAL_HEADERS = [
  'ID Evento', 'Timestamp', 'Ultima fecha de verificación', 'Fecha Completa', 'Hora Inicio', 'Hora Fin',
  'Evento (Nombre/Título)', 'Notas', 'Tipo de Actividad', 'Lugar de Realización',
  'Area Responsable', 'Aprobación Jefe', 'Estado Interno', 'Cobertura Fotográfica', 'URL Manual de Diseño'
];
const HEADER_MAP = {
  'ID Evento': 'idEvento',
  'Fecha Completa': 'fechaCompleta',
  'Hora Inicio': 'horaInicio',
  'Hora Fin': 'horaFin',
  'Evento (Nombre/Título)': 'evento',
  'Notas': 'notas',
  'Tipo de Actividad': 'tipoActividad',
  'Lugar de Realización': 'lugarRealizacion',
  'Area Responsable': 'areaResponsable',
  'Aprobación Jefe': 'aprobacionJefe',
  'Ultima fecha de verificación': 'ultimaFechaVerificacion',
  'Timestamp': 'timestamp',
  'Estado Interno': 'estadoInterno',
  'Cobertura Fotográfica': 'coberturaFotografica',
  'URL Manual de Diseño': 'urlManualDiseno'
};
const ARCHIVE_SHEET_NAME = "Archivo";

// ================== FUNCIONES PRINCIPALES ==================

function doGet() {
  return HtmlService.createHtmlOutput('<h2>¡Sistema listo! Usa el frontend HTML para interactuar.</h2>');
}

// ========== REGISTRO Y ARCHIVO DE EVENTOS ==========

function registrarNuevaActividad(eventData) {
  try {
    // Guardar archivo en Drive si existe
    let urlManualDiseno = '';
    if (eventData.archivoManualDiseno && eventData.nombreManualDiseno) {
      const fileData = eventData.archivoManualDiseno.split(',')[1];
      const contentType = eventData.archivoManualDiseno.match(/^data:(.*);base64,/)[1];
      const blob = Utilities.newBlob(Utilities.base64Decode(fileData), contentType, eventData.nombreManualDiseno);
      const folder = DriveApp.getFolderById(FOLDER_ID_MANUALES_DISENO);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urlManualDiseno = file.getUrl();
    }
    eventData.urlManualDiseno = urlManualDiseno;

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = mapObjectToRow_(eventData, headers);
    sheet.appendRow(newRow);
    actualizarEstadosYColores();
    enviarNotificacionRegistro(eventData);
    return `Evento "${eventData.evento}" registrado. Se ha actualizado el estado de la hoja.`;
  } catch (e) {
    throw new Error("Ocurrió un error al guardar en la hoja de cálculo: " + e.message);
  }
}

function registrarConConflicto(eventData) {
  eventData.estadoInterno = "Conflicto - Pendiente Aprobación";
  enviarNotificacionConflicto(eventData);
  return registrarNuevaActividad(eventData);
}

// ========== VERIFICACIÓN DE CONFLICTOS ==========

function verificarConflictos(newEventData) {
  if (!newEventData.fechaCompleta) {
    return { hasConflict: false };
  }
  const existingEvents = getDatosCalendario();
  const newEventDateFormatted = formatToSheetDate_(newEventData.fechaCompleta);

  const newEventStartTime = parseTime_(newEventData.horaInicio);
  const newEventEndTime = parseTime_(newEventData.horaFin);

  const conflictingEvents = existingEvents.filter(event => {
    if (!event.fechaCompleta) return false;
    const existingEventDateFormatted = formatToSheetDate_(event.fechaCompleta);
    if (existingEventDateFormatted !== newEventDateFormatted) return false;
    if (!newEventStartTime || !newEventEndTime || !event.horaInicio || !event.horaFin) return true;
    const existingEventStartTime = parseTime_(event.horaInicio);
    const existingEventEndTime = parseTime_(event.horaFin);
    if (!existingEventStartTime || !existingEventEndTime) return true;
    const overlap = (newEventStartTime < existingEventEndTime) && (newEventEndTime > existingEventStartTime);
    return overlap;
  });
  return {
    hasConflict: conflictingEvents.length > 0,
    conflictingEvents: conflictingEvents
  };
}

// ========== FUNCIONES DE AUDITORÍA Y ARCHIVO ==========

function actualizarEstadosYColores() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const dataRange = sheet.getDataRange();
  if (dataRange.getNumRows() <= 1) return;
  const values = dataRange.getValues();
  const headers = values.shift();
  const fechaCompletaColIndex = headers.indexOf('Fecha Completa');
  const estadoInternoColIndex = headers.indexOf('Estado Interno');
  const numColumns = headers.length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (fechaCompletaColIndex === -1 || estadoInternoColIndex === -1) return;

  const newStatuses = values.map(row => [row[estadoInternoColIndex]]);
  const newBackgrounds = values.map(() => Array(numColumns).fill(null));

  values.forEach((row, index) => {
    const dateValue = row[fechaCompletaColIndex];
    let eventDate = null;
    if (dateValue instanceof Date) {
      eventDate = new Date(dateValue);
    } else if (typeof dateValue === 'string') {
      eventDate = parseSheetDate_(dateValue.trim());
    }
    if (eventDate) {
      eventDate.setHours(0, 0, 0, 0);
      if (eventDate < today) {
        newStatuses[index][0] = "Finalizado";
        newBackgrounds[index].fill("#E0E0E0");
      }
    }
  });

  const dateMap = {};
  values.forEach((row, index) => {
    if (newStatuses[index][0] !== "Finalizado") {
      const dateValue = row[fechaCompletaColIndex];
      let dateStr = '';
      if (dateValue instanceof Date) {
        dateStr = formatToSheetDate_(dateValue);
      } else if (dateValue) {
        dateStr = dateValue.toString().trim();
      }
      if (dateStr) {
        if (!dateMap[dateStr]) dateMap[dateStr] = [];
        dateMap[dateStr].push(index);
      }
    }
  });

  for (const dateStr in dateMap) {
    const indices = dateMap[dateStr];
    const isConflict = indices.length > 1;
    if (isConflict) {
      indices.forEach(rowIndex => {
        if (newStatuses[rowIndex][0] !== "Finalizado") {
          newStatuses[rowIndex][0] = "Conflicto - Pendiente Aprobación";
          newBackgrounds[rowIndex].fill("#FFCCCC");
        }
      });
    } else {
      indices.forEach(rowIndex => {
        if (newStatuses[rowIndex][0] !== "Finalizado") {
          newStatuses[rowIndex][0] = "Aprobado";
        }
      });
    }
  }

  const dataBodyRange = sheet.getRange(2, 1, values.length, numColumns);
  const statusColumnRange = sheet.getRange(2, estadoInternoColIndex + 1, values.length, 1);

  statusColumnRange.setValues(newStatuses);
  dataBodyRange.setBackgrounds(newBackgrounds);

  SpreadsheetApp.flush();
}

function archiveFinalizedEvents() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sourceSheet = ss.getSheetByName(SHEET_NAME);
  if (sourceSheet.getLastRow() <= 1) return;
  let archiveSheet = ss.getSheetByName(ARCHIVE_SHEET_NAME);
  if (!archiveSheet) {
    archiveSheet = ss.insertSheet(ARCHIVE_SHEET_NAME);
    archiveSheet.getRange(1, 1, 1, CANONICAL_HEADERS.length).setValues([CANONICAL_HEADERS]);
    archiveSheet.setFrozenRows(1);
  }
  const dataRange = sourceSheet.getDataRange();
  const allValues = dataRange.getValues();
  const headers = allValues.shift();
  const estadoInternoColIndex = headers.indexOf('Estado Interno');
  if (estadoInternoColIndex === -1) return;
  const rowsToArchive = [];
  const rowsToKeep = [];
  allValues.forEach(row => {
    if (row[estadoInternoColIndex] === "Finalizado") {
      rowsToArchive.push(row);
    } else {
      rowsToKeep.push(row);
    }
  });
  if (rowsToArchive.length === 0) return;
  archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, rowsToArchive.length, headers.length).setValues(rowsToArchive);
  sourceSheet.getRange(2, 1, sourceSheet.getLastRow(), headers.length).clearContent();
  if (rowsToKeep.length > 0) {
    sourceSheet.getRange(2, 1, rowsToKeep.length, headers.length).setValues(rowsToKeep);
  }
}

function createMonthlyArchiveTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let triggerExists = false;
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'archiveFinalizedEvents') {
      triggerExists = true;
      break;
    }
  }
  if (!triggerExists) {
    ScriptApp.newTrigger('archiveFinalizedEvents')
      .timeBased()
      .onMonthDay(1)
      .atHour(2)
      .create();
  }
}

function deleteMonthlyArchiveTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'archiveFinalizedEvents') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
}

// ========== UTILIDADES Y NOTIFICACIONES ==========

function getDatosCalendario() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const range = sheet.getDataRange();
  const values = range.getValues();
  const headers = values.shift();
  return values.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      const key = HEADER_MAP[header];
      if (key) {
        obj[key] = (row[index] instanceof Date) ? formatToSheetDate_(row[index]) : row[index];
      }
    });
    return obj;
  });
}

function parseSheetDate_(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  const parts = dateString.split('/');
  if (parts.length !== 3) return null;
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

function formatToSheetDate_(date) {
  const d = (date instanceof Date) ? date : new Date(date.replace(/-/g, '/'));
  const day = ('0' + d.getDate()).slice(-2);
  const month = ('0' + (d.getMonth() + 1)).slice(-2);
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseTime_(timeString) {
  if (!timeString || typeof timeString !== 'string') return null;
  const dummyDate = new Date('2000-01-01T00:00:00Z');
  const match = timeString.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3] ? match[3].toUpperCase() : null;
  if (ampm === 'PM' && hours < 12) hours += 12;
  else if (ampm === 'AM' && hours === 12) hours = 0;
  dummyDate.setUTCHours(hours, minutes, 0, 0);
  return dummyDate;
}

function mapObjectToRow_(dataObject, headers) {
  dataObject.idEvento = dataObject.idEvento || generateUniqueId_();
  dataObject.timestamp = new Date().toLocaleString("es-MX");
  dataObject.ultimaFechaVerificacion = formatToSheetDate_(new Date());
  if (dataObject.fechaCompleta) {
    dataObject.fechaCompleta = formatToSheetDate_(dataObject.fechaCompleta);
  } else {
    dataObject.fechaCompleta = "";
  }
  dataObject.horaInicio = dataObject.horaInicio || "";
  dataObject.horaFin = dataObject.horaFin || "";
  dataObject.coberturaFotografica = dataObject.coberturaFotografica || "No";
  const notesPlaceholder = "Quién imparte el taller, o toda la información que se considere para un copy o pauta para redes sociales.";
  dataObject.notas = dataObject.notas || notesPlaceholder;
  dataObject.estadoInterno = dataObject.estadoInterno || "Aprobado";
  return headers.map(header => dataObject[HEADER_MAP[header]] || "");
}

function generateUniqueId_() {
  const now = new Date();
  const year = now.getFullYear();
  const month = ('0' + (now.getMonth() + 1)).slice(-2);
  const day = ('0' + now.getDate()).slice(-2);
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CECAN-${year}${month}${day}-${randomPart}`;
}

function enviarNotificacionRegistro(eventData) {
  const supervisorEmail = "ericktr1994@gmail.com"; // Cambia por el correo real
  const subject = `Nuevo Evento Registrado: ${eventData.evento}`;
  const body = `Se ha registrado un nuevo evento:\n\n` +
    `ID: ${eventData.idEvento || 'N/A'}\n` +
    `Evento: ${eventData.evento || 'N/A'}\n` +
    `Fecha: ${eventData.fechaCompleta || 'N/A'}\n` +
    `Hora Inicio: ${eventData.horaInicio || 'N/A'}\n` +
    `Hora Fin: ${eventData.horaFin || 'N/A'}\n` +
    `Tipo de Actividad: ${eventData.tipoActividad || 'N/A'}\n` +
    `Lugar: ${eventData.lugarRealizacion || 'N/A'}\n` +
    `Área Responsable: ${eventData.areaResponsable || 'N/A'}\n` +
    `Notas: ${eventData.notas || 'N/A'}\n` +
    `Cobertura Fotográfica: ${eventData.coberturaFotografica || 'N/A'}\n\n` +
    `Estado Interno: ${eventData.estadoInterno || 'N/A'}\n\n` +
    `Por favor, revise el calendario para más detalles.`;
  MailApp.sendEmail(supervisorEmail, subject, body);
}

function enviarNotificacionConflicto(eventData) {
  const supervisorEmail = "ericktr1994@gmail.com"; // Cambia por el correo real
  const subject = `Alerta de Conflicto: Se ha forzado el registro del evento "${eventData.evento}"`;
  const body = `Se ha registrado un nuevo evento que entra en conflicto de fecha con otros existentes. Se requiere revisión.`;
  MailApp.sendEmail(supervisorEmail, subject, body);
}

/*
INSTRUCCIONES:
1. Pega este código en un nuevo proyecto de Google Apps Script.
2. Ejecuta la función setupTodoDesdeCero() UNA SOLA VEZ desde el editor.
3. ¡Listo! Ya puedes usar tu frontend HTML y todo funcionará automáticamente.
*/
