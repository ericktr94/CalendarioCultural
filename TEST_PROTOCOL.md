# Protocolo de Prueba del Usuario Final - Sistema de Gestión de Eventos CECAN

Después de seguir la `DEPLOYMENT_GUIDE.md` y obtener la URL de tu aplicación web, sigue esta lista de verificación para asegurarte de que todo funciona como se espera.

## Preparación

*   Ten a mano la **URL de tu aplicación web desplegada**.
*   Ten abierta la **Hoja de Cálculo de Google** que configuraste para la aplicación.
*   Ten abierto (opcionalmente) el **Google Calendar** que configuraste para los eventos aprobados.

## Lista de Verificación de Pruebas

**1. Carga Inicial de la Aplicación**
   *   [ ] **Acción**: Abre la URL de tu aplicación web en un navegador.
   *   [ ] **Confirmación**: La página se carga correctamente. Deberías ver el título "Sistema de Gestión de Eventos Culturales - CECAN" y el formulario para "Registrar Nuevo Evento". No deben aparecer mensajes de error visibles en la página principal.
   *   [ ] **Confirmación**: La tabla "Listado de Eventos" se muestra, posiblemente con el mensaje "Cargando eventos..." y luego "No hay eventos para mostrar." si es la primera vez.

**2. Registro de un Nuevo Evento de Prueba**
   *   [ ] **Acción**: Completa todos los campos del formulario "Registrar Nuevo Evento" con datos de ejemplo.
        *   **Nombre del Evento**: `Evento de Prueba Inicial`
        *   **Fecha**: Elige una fecha futura (ej. la próxima semana).
        *   **Hora Inicio**: `10:00`
        *   **Hora Fin**: `12:00`
        *   **Tipo de Actividad**: `Prueba`
        *   **Lugar de Realización**: `Oficina de Pruebas`
        *   **Ubicacion Especifica**: `Sala 1`
        *   **Área Responsable**: Elige cualquier opción de la lista.
        *   **Cobertura Fotográfica**: `Sí`
        *   **Necesita Diseño**: `No`
        *   **Notas Adicionales**: `Este es un evento de prueba.`
        *   **Manual de Diseño**: (Opcional) Si configuraste la carpeta de Drive, intenta adjuntar un archivo pequeño (ej. un `.txt` o `.jpg`).
   *   [ ] **Acción**: Haz clic en el botón "Registrar Evento".

**3. Confirmación de Registro Exitoso**
   *   [ ] **Confirmación**: El botón "Registrar Evento" debe mostrar "Registrando..." y luego volver a "Registrar Evento".
   *   [ ] **Confirmación**: Debe aparecer una notificación verde en la esquina inferior derecha de la pantalla con un mensaje similar a: `Evento "Evento de Prueba Inicial" registrado con éxito.`
   *   [ ] **Confirmación**: El formulario de registro se debe limpiar (los campos deben quedar vacíos).

**4. Verificación en la Hoja de Cálculo (Base de Datos)**
   *   [ ] **Acción**: Ve a tu Hoja de Cálculo de Google (`Eventos`).
   *   [ ] **Confirmación**: Debería aparecer una nueva fila al final de la hoja con los datos que acabas de ingresar para "Evento de Prueba Inicial".
   *   [ ] **Confirmación**: Verifica que la columna `ID Evento` tenga un valor (ej. `EVT-xxxxxxxxxxxxx`).
   *   [ ] **Confirmación**: Verifica que la columna `Timestamp` tenga la fecha y hora actual.
   *   [ ] **Confirmación**: Verifica que la columna `Aprobación Jefe` diga `Pendiente de Aprobación`.
   *   [ ] **Confirmación**: (Si adjuntaste un archivo) Verifica que la columna `URL Manual de Diseño` contenga una URL de Google Drive.

**5. Visualización del Nuevo Evento en la Aplicación**
   *   [ ] **Acción**: Vuelve a la página de la aplicación web (o refréscala si es necesario).
   *   [ ] **Confirmación**: El evento "Evento de Prueba Inicial" debe aparecer ahora en la tabla "Listado de Eventos".
   *   [ ] **Confirmación**: Verifica que los detalles mostrados (Estado, Evento, Fecha, Horario, Área Responsable) coincidan con lo que ingresaste. El estado inicial debería ser `Pendiente` o `SemanaActual` (si la fecha que elegiste cae en la semana en curso).

**6. Prueba de Aprobación de Evento**
   *   [ ] **Acción**: En la fila del "Evento de Prueba Inicial" en la tabla, haz clic en el botón "Aprobar".
   *   [ ] **Confirmación**: El botón debe mostrar "Aprobando..." y luego desaparecer o la fila actualizarse.
   *   [ ] **Confirmación**: Debe aparecer una notificación verde con un mensaje similar a: `Evento aprobado y añadido al calendario. ID de Calendar: ...`
   *   [ ] **Confirmación**: En la tabla de la aplicación, el estado del "Evento de Prueba Inicial" debe cambiar a `Aprobado`.

**7. Verificación de Aprobación en la Hoja de Cálculo**
   *   [ ] **Acción**: Ve a tu Hoja de Cálculo de Google.
   *   [ ] **Confirmación**: En la fila del "Evento de Prueba Inicial", la columna `Aprobación Jefe` debe haber cambiado a `Aprobado por Jefe`.
   *   [ ] **Confirmación**: La columna `ID Evento Calendar` debe ahora contener un ID largo (este es el ID del evento en Google Calendar).

**8. Verificación en Google Calendar (Opcional, si se configuró)**
   *   [ ] **Acción**: Abre el Google Calendar que especificaste en la configuración (`CALENDAR_ID` en `Code.gs`).
   *   [ ] **Confirmación**: Deberías ver el "Evento de Prueba Inicial" creado en la fecha y hora que especificaste.
   *   [ ] **Confirmación**: Verifica que el título, la descripción (si pusiste notas) y la ubicación sean correctos en el evento del calendario.

**9. Prueba de Filtros (Búsqueda y Estado)**
   *   [ ] **Acción**: Registra un segundo evento: "Otro Evento de Prueba", con fecha diferente y área responsable distinta. No lo apruebes aún.
   *   [ ] **Acción**: En la aplicación web, en el campo "Buscar por nombre...", escribe `Evento de Prueba Inicial`.
   *   [ ] **Confirmación**: La tabla solo debe mostrar el "Evento de Prueba Inicial".
   *   [ ] **Acción**: Borra el texto del campo de búsqueda.
   *   [ ] **Acción**: En el desplegable "Todos los Estados", selecciona "Aprobado".
   *   [ ] **Confirmación**: La tabla solo debe mostrar el "Evento de Prueba Inicial" (que fue aprobado).
   *   [ ] **Acción**: En el desplegable "Todos los Estados", selecciona "Pendiente" (o "SemanaActual" según corresponda para el segundo evento).
   *   [ ] **Confirmación**: La tabla solo debe mostrar "Otro Evento de Prueba".
   *   [ ] **Acción**: Vuelve a seleccionar "Todos los Estados". Ambos eventos deben aparecer.

**10. Prueba de Eliminación de Evento**
    *   [ ] **Acción**: En la fila de "Otro Evento de Prueba" (el que no está aprobado), haz clic en el botón "Eliminar".
    *   [ ] **Confirmación**: Debería aparecer un cuadro de diálogo pidiendo confirmación.
    *   [ ] **Acción**: Haz clic en "Aceptar" (o "OK").
    *   [ ] **Confirmación**: Debe aparecer una notificación verde: `Evento eliminado permanentemente.`
    *   [ ] **Confirmación**: "Otro Evento de Prueba" debe desaparecer de la tabla en la aplicación web.
    *   [ ] **Acción**: Ve a tu Hoja de Cálculo de Google.
    *   [ ] **Confirmación**: La fila correspondiente a "Otro Evento de Prueba" debe haber sido eliminada de la hoja.

**11. Prueba de Eliminación de Evento Aprobado (y del Calendario)**
    *   [ ] **Acción**: En la fila del "Evento de Prueba Inicial" (el que fue aprobado), haz clic en el botón "Eliminar".
    *   [ ] **Acción**: Confirma la eliminación.
    *   [ ] **Confirmación**: Notificación de `Evento eliminado permanentemente.`
    *   [ ] **Confirmación**: El evento desaparece de la tabla en la aplicación web.
    *   [ ] **Acción**: Ve a tu Hoja de Cálculo de Google.
    *   [ ] **Confirmación**: La fila del "Evento de Prueba Inicial" debe haber sido eliminada.
    *   [ ] **Acción**: Ve a tu Google Calendar.
    *   [ ] **Confirmación**: El "Evento de Prueba Inicial" que se había creado en el calendario también debe haber sido eliminado.

---

Si todas estas verificaciones son exitosas, ¡tu aplicación está funcionando correctamente! Si encuentras algún problema, vuelve a revisar la `DEPLOYMENT_GUIDE.md` o consulta la sección de "Solución de Problemas Comunes".
