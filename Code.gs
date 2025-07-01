/**

Constantes Globales para configuración del proyecto.
Centralizar los IDs aquí facilita el mantenimiento.
*/
const SPREADSHEET_ID = '1l8KPoPuvNLH1Br3YQpB4wGhvRjzfWGQnmtAIOF6oENE';
const SHEET_NAME = 'Eventos';
const DRIVE_FOLDER_ID = '1hZxH7kQP4xey83SG9r7n5M1wq992eCTA';
const CALENDAR_ID = 'ericktr1994@gmail.com';
/**

Sirve la aplicación web principal.
@returns {HtmlOutput} La interfaz de usuario de la aplicación.
*/
function doGet() {
return HtmlService.createTemplateFromFile('Index').evaluate()
.setTitle('Sistema de Gestión de Eventos Culturales - CECAN')
.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}
/**

Incluye el contenido de otros archivos HTML en la plantilla principal.
@param {string} filename El nombre del archivo a incluir (sin extensión).
@returns {string} El contenido del archivo.
*/
function include(filename) {
return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
/**

Registra un nuevo evento en la hoja de cálculo.

@param {object} formObject El objeto del formulario enviado desde el frontend.

@returns {string} Un mensaje de éxito.
*/
function addEvent(formObject) {
try {
const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

// Generar ID único para el evento
const eventId = 'EVT-' + new Date().getTime();

// Procesar posible archivo adjunto
let fileUrl = '';
if (formObject.fileData && formObject.fileName) {
const decodedFile = Utilities.base64Decode(formObject.fileData);
const blob = Utilities.newBlob(decodedFile, formObject.fileMimeType, formObject.fileName);
const file = DriveApp.getFolderById(DRIVE_FOLDER_ID).createFile(blob);
fileUrl = file.getUrl();
}

// Construir la fila del nuevo evento
const newRow = headers.map(header => {
switch(header) {
case 'ID Evento': return eventId;
case 'Timestamp': return new Date();
case 'URL Manual de Diseño': return fileUrl;
case 'Aprobación Jefe': return 'Pendiente de Aprobación';
case 'ID Evento Calendar': return '';
default: return formObject[header] || '';
}
});

sheet.appendRow(newRow);
return `Evento "${formObject['Evento (Nombre/Título)']}" registrado con éxito.`;

} catch (e) {
Logger.log('Error en addEvent: ' + e.toString());
throw new Error('No se pudo registrar el evento. Verifique los registros del servidor.');
}
}

/**

Obtiene la lista completa de eventos con su estado calculado.

@returns {Array} Un array de objetos, donde cada objeto es un evento.
*/
function getEvents() {
try {
const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
// Evitar obtener datos de una hoja vacía o solo con cabecera
if (sheet.getLastRow() < 2) {
return [];
}
const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
const values = range.getValues();
const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

let events = values.map(row => {
const eventObject = {};
headers.forEach((header, i) => {
eventObject[header] = row[i];
});
return eventObject;
});

// Ordenar eventos por fecha y hora para la lógica de conflictos
events.sort((a, b) => {
const dateA = new Date(a['Fecha Completa']);
const dateB = new Date(b['Fecha Completa']);
if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;

const timeA = a['Hora Inicio'] ? new Date(`1970-01-01T${a['Hora Inicio']}`) : 0;
const timeB = b['Hora Inicio'] ? new Date(`1970-01-01T${b['Hora Inicio']}`) : 0;
return timeA - timeB;
});

const today = new Date();
today.setHours(0, 0, 0, 0);

for (let i = 0; i < events.length; i++) {
let computedStatus = "";
const eventDate = new Date(events[i]['Fecha Completa']);

// 1. Prioridad máxima: Estados finales
if (events[i]['Aprobación Jefe'] === 'Cancelado') {
computedStatus = 'Cancelado';
} else if (events[i]['Aprobación Jefe'] === 'Aprobado por Jefe') {
computedStatus = 'Aprobado';
} else {
// 2. Lógica de conflictos
if (i > 0) {
const prevEvent = events[i - 1];
if (prevEvent['Aprobación Jefe'] !== 'Cancelado' && prevEvent['Aprobación Jefe'] !== 'Aprobado por Jefe') {
const prevEventDate = new Date(prevEvent['Fecha Completa']);
if (prevEventDate.toDateString() === eventDate.toDateString() && prevEvent['Hora Fin'] && events[i]['Hora Inicio']) {
const prevEndTime = new Date(`1970-01-01T${prevEvent['Hora Fin']}`);
const currentStartTime = new Date(`1970-01-01T${events[i]['Hora Inicio']}`);
const diffHours = (currentStartTime - prevEndTime) / (3600000); // 1000 * 60 * 60

       if (diffHours < 5) {
         computedStatus = 'Conflicto';
         if (!prevEvent.computedStatus) { // Evitar sobreescribir
            prevEvent.computedStatus = 'Conflicto';
         }
       }
     }
   }
 }
 // 3. Lógica de Pasado / Semana Actual
 if (computedStatus === "") {
   if (eventDate < today) {
     computedStatus = 'Pasado';
   } else {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      if (eventDate >= startOfWeek && eventDate <= endOfWeek) {
          computedStatus = 'SemanaActual';
      }
   }
 }
}
events[i].computedStatus = computedStatus || 'Pendiente'; // Estado por defecto
}
return events;
} catch (e) {
Logger.log('Error en getEvents: ' + e.toString());
throw new Error('No se pudieron obtener los eventos.');
}
}

/**

Aprueba un evento, lo crea en Google Calendar y guarda el ID de Calendar.

@param {string} eventId El ID del evento a aprobar.

@returns {string} Un mensaje de éxito con el ID del evento de calendario.
*/
function approveEventAndCreateCalendar(eventId) {
try {
const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
const data = sheet.getDataRange().getValues();
const headers = data[0];
const eventRowIndex = data.slice(1).findIndex(row => row[headers.indexOf('ID Evento')] === eventId) + 1;

if (eventRowIndex === 0) throw new Error("Evento no encontrado.");

const eventData = data[eventRowIndex];
const event = {};
headers.forEach((header, i) => event[header] = eventData[i]);

// Crear evento en Google Calendar
const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
const title = event['Evento (Nombre/Título)'];
const startTime = new Date(`${event['Fecha Completa'].toISOString().split('T')[0]}T${event['Hora Inicio']}`);
const endTime = new Date(`${event['Fecha Completa'].toISOString().split('T')[0]}T${event['Hora Fin']}`);

const calendarEvent = calendar.createEvent(title, startTime, endTime, {
description: event['Notas'] || '',
location: `${event['Lugar de Realización']} - ${event['Ubicacion Especifica']}`
});

const calendarEventId = calendarEvent.getId();

// Actualizar la hoja de cálculo
sheet.getRange(eventRowIndex + 1, headers.indexOf('Aprobación Jefe') + 1).setValue('Aprobado por Jefe');
sheet.getRange(eventRowIndex + 1, headers.indexOf('ID Evento Calendar') + 1).setValue(calendarEventId);

return `Evento aprobado y añadido al calendario. ID de Calendar: ${calendarEventId}`;
} catch (e) {
Logger.log('Error en approveEventAndCreateCalendar: ' + e.toString());
throw new Error('Fallo al aprobar el evento o crearlo en el calendario.');
}
}

/**

Elimina una fila de evento de la hoja de cálculo.

@param {string} eventId El ID del evento a eliminar.

@returns {string} Un mensaje de éxito.
*/
function deleteEvent(eventId) {
try {
const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
const data = sheet.getDataRange().getValues();
const idColIndex = data[0].indexOf('ID Evento');

 for (let i = 1; i < data.length; i++) {
     if (data[i][idColIndex] == eventId) {
         sheet.deleteRow(i + 1);
         // Si el evento estaba en Calendar, eliminarlo también
         const calendarIdColIndex = data[0].indexOf('ID Evento Calendar');
         const calendarEventId = data[i][calendarIdColIndex];
         if (calendarEventId) {
             try {
                 const event = CalendarApp.getCalendarById(CALENDAR_ID).getEventById(calendarEventId);
                 if (event) event.deleteEvent();
             } catch (calError) {
                 Logger.log(`No se pudo eliminar el evento de calendario ${calendarEventId}: ${calError}`);
             }
         }
         return "Evento eliminado permanentemente.";
     }
 }
 throw new Error("Evento no encontrado para eliminar.");
} catch (e) {
Logger.log(`Error en deleteEvent: ${e.toString()}`);
throw new Error("No se pudo eliminar el evento.");
}
}
