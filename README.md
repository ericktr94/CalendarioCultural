# Sistema de Gestión de Eventos Culturales - CECAN

## Resumen del Proyecto
Este repositorio contiene la arquitectura completa, el código fuente y la hoja de ruta para una aplicación web autocontenida construida en Google Apps Script. El objetivo del sistema es gestionar el ciclo de vida completo de los eventos culturales para el Consejo Estatal para la Cultura y las Artes de Nayarit (CECAN), desde su registro y aprobación hasta su visualización y gestión.

## Arquitectura y Configuración

Esta es la fuente de verdad absoluta para la configuración del sistema.

*   **Backend**: `Code.gs` (Google Apps Script)
*   **Base de Datos**: Google Sheet
    *   **ID de la Hoja de Cálculo**: `1l8KPoPuvNLH1Br3YQpB4wGhvRjzfWGQnmtAIOF6oENE` (Este ID es un ejemplo y debe ser reemplazado por el ID de tu propia hoja de cálculo durante el despliegue).
    *   **Pestaña de Datos**: `Eventos`
    *   **Columnas Requeridas (Orden A-P)**:
        1.  `ID Evento` (Texto, generado automáticamente, ej: EVT-1690000000000)
        2.  `Timestamp` (Fecha/Hora, generado automáticamente)
        3.  `Evento (Nombre/Título)` (Texto)
        4.  `Fecha Completa` (Fecha, ej: YYYY-MM-DD)
        5.  `Hora Inicio` (Texto, formato HH:MM)
        6.  `Hora Fin` (Texto, formato HH:MM)
        7.  `Tipo de Actividad` (Texto)
        8.  `Lugar de Realización` (Texto)
        9.  `Ubicacion Especifica` (Texto)
        10. `Area Responsable` (Texto, seleccionable de una lista)
        11. `Cobertura Fotográfica` (Texto, "Sí" o "No")
        12. `Necesita Diseño` (Texto, "Sí" o "No")
        13. `URL Manual de Diseño` (Texto, URL, opcional, generado si se sube archivo)
        14. `Notas` (Texto, opcional)
        15. `Aprobación Jefe` (Texto, por defecto "Pendiente de Aprobación", luego "Aprobado por Jefe" o "Cancelado")
        16. `ID Evento Calendar` (Texto, ID del evento de Google Calendar, generado al aprobar)
*   **Frontend**: Una única aplicación web servida a través de `Index.html` que incluye dinámicamente el contenido de `JavaScript.html` (lógica) y `CSS.html` (estilos).
*   **Integraciones**:
    *   **Google Drive (Carpeta de Diseños)**: `1hZxH7kQP4xey83SG9r7n5M1wq992eCTA` (Este ID es un ejemplo y debe ser reemplazado por el ID de tu propia carpeta de Drive). Se usa para almacenar manuales de diseño adjuntados a los eventos.
    *   **Google Calendar (Objetivo)**: `ericktr1994@gmail.com` (Este ID es un ejemplo y debe ser reemplazado por el ID del calendario donde se publicarán los eventos aprobados).

## Lógica de Negocio Clave

El núcleo del sistema reside en el cálculo de estados dinámicos para cada evento (`computedStatus`). Este estado se calcula en tiempo real cada vez que se cargan los eventos desde el backend y sigue una lógica de prioridades estricta:

1.  **Prioridad 1: Estados Finales.**
    *   Si el campo `Aprobación Jefe` es "Aprobado por Jefe", el `computedStatus` es "Aprobado".
    *   Si el campo `Aprobación Jefe` es "Cancelado", el `computedStatus` es "Cancelado".
    *(Estos estados anulan cualquier otra lógica)*.

2.  **Prioridad 2: Conflicto.**
    *   Si dos eventos (que no tengan un estado final definido en la Prioridad 1) ocurren el mismo día (`Fecha Completa`) Y la `Hora Inicio` de un evento es menos de 5 horas después de la `Hora Fin` del evento anterior en la misma fecha, ambos eventos se marcan con `computedStatus` = "Conflicto".
    *   Los eventos se ordenan por fecha y luego por hora de inicio antes de esta verificación.

3.  **Prioridad 3: Pasado.**
    *   Si la `Fecha Completa` de un evento es anterior al día actual (y no cumple condiciones de Prioridad 1 o 2), se marca con `computedStatus` = "Pasado".

4.  **Prioridad 4: Semana Actual.**
    *   Si un evento ocurre dentro de la semana en curso (Lunes a Domingo, basado en el día actual) y no cumple ninguna de las condiciones anteriores (Prioridad 1, 2 o 3), se marca con `computedStatus` = "SemanaActual".

5.  **Por Defecto: Pendiente.**
    *   Cualquier otro evento (generalmente futuros, que no entran en conflicto y están pendientes de aprobación) recibe `computedStatus` = "Pendiente".

## Flujo de Usuario Principal

1.  **Registro de Evento**: Un usuario accede a la aplicación web y completa el formulario con los detalles del evento. Opcionalmente, puede adjuntar un archivo (ej. manual de diseño). Al enviar, el evento se guarda en la Google Sheet con estado "Pendiente de Aprobación".
2.  **Visualización y Filtrado**: Los usuarios pueden ver todos los eventos en una tabla. Pueden buscar por nombre de evento o filtrar por el `computedStatus`.
3.  **Aprobación de Evento**: Un usuario con permisos (funcionalidad futura) o cualquier usuario (en la versión actual) puede hacer clic en "Aprobar" en un evento "Pendiente", "Conflicto" o "SemanaActual".
    *   Esto cambia el estado `Aprobación Jefe` a "Aprobado por Jefe" en la Google Sheet.
    *   Crea un evento correspondiente en el Google Calendar configurado.
    *   Guarda el ID del evento de Calendar en la Google Sheet.
4.  **Eliminación de Evento**: Un usuario puede eliminar un evento.
    *   Esto elimina la fila correspondiente de la Google Sheet.
    *   Si el evento tenía un ID de Calendar asociado, también intenta eliminar el evento del Google Calendar.

## Archivos del Proyecto

*   `Code.gs`: Contiene toda la lógica del backend de Google Apps Script, incluyendo funciones para servir la UI, agregar, obtener, aprobar y eliminar eventos, y la lógica de `computedStatus`.
*   `Index.html`: Es el archivo HTML principal que estructura la página web. Utiliza la función `include()` de `Code.gs` para insertar el contenido de `CSS.html` y `JavaScript.html`.
*   `JavaScript.html`: Contiene todo el código JavaScript del lado del cliente para manejar la interacción del usuario, la comunicación con el backend (`google.script.run`), la renderización de la tabla de eventos, el manejo de formularios y las notificaciones.
*   `CSS.html`: Contiene todos los estilos CSS para la aplicación web, asegurando una interfaz de usuario coherente y agradable.
*   `README.md`: Este archivo, con la descripción general del proyecto.
*   `DEPLOYMENT_GUIDE.md` (A ser generado): Instrucciones detalladas para desplegar la aplicación.
*   `TEST_PROTOCOL.md` (A ser generado): Pasos para verificar que la aplicación funciona correctamente después del despliegue.

## Hoja de Ruta y Mejoras Futuras (Extracto del Documento Original)

*   **Optimización de `setupSheet`**: (Si existe una función de configuración inicial de la hoja) optimizarla para usar operaciones por lotes.
*   **Sistema de Roles de Usuario**: Implementar distinción entre usuarios registradores y aprobadores usando `Session.getActiveUser().getEmail()` y una hoja de permisos.
*   **Edición de Eventos**: Permitir la modificación de eventos existentes a través de un formulario modal.
*   **Notificaciones por Correo**: Enviar emails automáticos en diferentes etapas del ciclo de vida del evento.
*   **Dashboard de Estadísticas**: Añadir una vista con gráficos sobre los datos de eventos.
*   **Paginación**: Para manejar un gran número de eventos en la tabla.

Este `README.md` proporciona una visión general. Para detalles de implementación específicos, consulte los archivos de código fuente correspondientes.
