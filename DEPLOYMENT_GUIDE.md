# Guía de Despliegue: Sistema de Gestión de Eventos CECAN

Esta guía te ayudará a desplegar el Sistema de Gestión de Eventos Culturales CECAN en tu propia cuenta de Google. Sigue estos pasos cuidadosamente.

## Requisitos Previos

*   Una cuenta de Google (Gmail o Google Workspace).
*   Acceso a Google Drive, Google Sheets y Google Calendar.

## Parte 1: Configurar la Hoja de Cálculo (Google Sheet)

1.  **Crear una Nueva Hoja de Cálculo**:
    *   Ve a [Google Sheets](https://sheets.google.com) y crea una nueva hoja de cálculo en blanco.
    *   Puedes nombrarla, por ejemplo, "Gestión de Eventos CECAN - Datos".

2.  **Renombrar la Pestaña Principal**:
    *   En la parte inferior de la hoja, verás una pestaña llamada "Hoja 1" (o similar). Haz doble clic en ella y renómbrala a `Eventos`. Es muy importante que el nombre sea exactamente `Eventos` (mayúscula inicial, resto minúsculas).

3.  **Copiar los Encabezados de Columna**:
    *   En la primera fila de la pestaña `Eventos`, copia y pega los siguientes encabezados, cada uno en una celda separada, desde la columna A hasta la columna P:
        *   `ID Evento`
        *   `Timestamp`
        *   `Evento (Nombre/Título)`
        *   `Fecha Completa`
        *   `Hora Inicio`
        *   `Hora Fin`
        *   `Tipo de Actividad`
        *   `Lugar de Realización`
        *   `Ubicacion Especifica`
        *   `Area Responsable`
        *   `Cobertura Fotográfica`
        *   `Necesita Diseño`
        *   `URL Manual de Diseño`
        *   `Notas`
        *   `Aprobación Jefe`
        *   `ID Evento Calendar`
    *   Asegúrate de que estén en este orden exacto.

4.  **Obtener el ID de la Hoja de Cálculo**:
    *   Mira la URL (dirección web) de tu nueva hoja de cálculo. Se verá algo así:
        `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID_LARGO/edit#gid=0`
    *   Copia la parte larga que está entre `/d/` y `/edit`. Ese es tu **ID de Hoja de Cálculo**. Guárdalo, lo necesitarás pronto.

## Parte 2: Configurar la Carpeta de Google Drive (Opcional, pero recomendado)

Si planeas usar la funcionalidad de adjuntar manuales de diseño:

1.  **Crear una Carpeta en Google Drive**:
    *   Ve a [Google Drive](https://drive.google.com) y crea una nueva carpeta.
    *   Puedes nombrarla, por ejemplo, "Manuales de Diseño Eventos CECAN".
2.  **Obtener el ID de la Carpeta**:
    *   Abre la carpeta que acabas de crear.
    *   Mira la URL. Se verá algo así:
        `https://drive.google.com/drive/folders/ESTE_ES_EL_ID_DE_LA_CARPETA`
    *   Copia la parte final de la URL después de `folders/`. Ese es tu **ID de Carpeta de Drive**. Guárdalo.

## Parte 3: Crear y Configurar el Proyecto en Google Apps Script

1.  **Crear un Nuevo Proyecto de Apps Script**:
    *   Ve a [Google Apps Script](https://script.google.com).
    *   Haz clic en "Nuevo proyecto" (o un botón similar para crear un proyecto en blanco).
    *   Dale un nombre a tu proyecto en la parte superior izquierda, por ejemplo, "Sistema Eventos CECAN".

2.  **Copiar el Código del Backend (`Code.gs`)**:
    *   En el editor de Apps Script, verás un archivo llamado `Código.gs` o `Code.gs`. Borra cualquier contenido que tenga.
    *   Abre el archivo `Code.gs` que te proporcionamos (o que tienes en tu repositorio).
    *   Copia TODO el contenido de ese archivo.
    *   Pega el contenido copiado en el archivo `Code.gs` de tu proyecto de Apps Script.

3.  **Actualizar los IDs en `Code.gs`**:
    *   En el código que acabas de pegar en `Code.gs`, busca estas líneas al principio:
        ```javascript
        const SPREADSHEET_ID = '1l8KPoPuvNLH1Br3YQpB4wGhvRjzfWGQnmtAIOF6oENE';
        const SHEET_NAME = 'Eventos'; // Este ya debería estar correcto
        const DRIVE_FOLDER_ID = '1hZxH7kQP4xey83SG9r7n5M1wq992eCTA';
        const CALENDAR_ID = 'ericktr1994@gmail.com';
        ```
    *   Reemplaza el valor de `SPREADSHEET_ID` con el **ID de Hoja de Cálculo** que copiaste en la Parte 1, Paso 4.
    *   Si creaste una carpeta de Drive: Reemplaza el valor de `DRIVE_FOLDER_ID` con el **ID de Carpeta de Drive** que copiaste en la Parte 2, Paso 2. Si no vas a usar esta función, puedes dejar el ID de ejemplo, pero la subida de archivos no funcionará correctamente.
    *   Reemplaza el valor de `CALENDAR_ID` con la dirección de correo electrónico del Google Calendar donde quieres que se creen los eventos aprobados (ej. `tuemail@gmail.com`). Puede ser tu calendario principal o uno específico para estos eventos.

4.  **Crear el Archivo HTML Principal (`Index.html`)**:
    *   En el editor de Apps Script, haz clic en el signo `+` al lado de "Archivos".
    *   Selecciona "HTML".
    *   Nombra el archivo `Index` (exactamente así, con mayúscula inicial).
    *   Borra cualquier contenido que tenga el nuevo archivo `Index.html`.
    *   Abre el archivo `Index.html` que te proporcionamos.
    *   Copia TODO su contenido y pégalo en el archivo `Index.html` de tu proyecto de Apps Script.

5.  **Crear el Archivo de Estilos (`CSS.html`)**:
    *   Haz clic de nuevo en el signo `+` al lado de "Archivos".
    *   Selecciona "HTML".
    *   Nombra el archivo `CSS` (exactamente así, todo en mayúsculas).
    *   Borra cualquier contenido que tenga.
    *   Abre el archivo `CSS.html` que te proporcionamos.
    *   Copia TODO su contenido (incluyendo las etiquetas `<style>` y `</style>`) y pégalo en el archivo `CSS.html` de tu proyecto de Apps Script.

6.  **Crear el Archivo de Lógica Frontend (`JavaScript.html`)**:
    *   Haz clic de nuevo en el signo `+` al lado de "Archivos".
    *   Selecciona "HTML".
    *   Nombra el archivo `JavaScript` (exactamente así, con mayúscula inicial).
    *   Borra cualquier contenido que tenga.
    *   Abre el archivo `JavaScript.html` que te proporcionamos.
    *   Copia TODO su contenido (incluyendo las etiquetas `<script>` y `</script>`) y pégalo en el archivo `JavaScript.html` de tu proyecto de Apps Script.

7.  **Guardar el Proyecto**:
    *   Haz clic en el icono de disquete (Guardar proyecto) en la barra de herramientas.

## Parte 4: Desplegar la Aplicación Web

1.  **Ejecutar una Función para Autorización Inicial (Importante)**:
    *   En la barra de herramientas del editor de Apps Script, donde dice "Seleccionar función", elige `doGet`.
    *   Haz clic en el botón "Ejecutar".
    *   La primera vez, Google te pedirá permisos:
        *   Haz clic en "Revisar permisos".
        *   Elige tu cuenta de Google.
        *   Podría aparecer una advertencia de "Google no ha verificado esta aplicación". Haz clic en "Configuración avanzada" (o similar) y luego en "Ir a [Nombre de tu proyecto] (no seguro)".
        *   Revisa los permisos que solicita (acceso a Sheets, Drive, Calendar, etc.) y haz clic en "Permitir".
    *   Esto es necesario para que el script pueda acceder a tus servicios de Google. Si no ves una petición de permisos, puede que ya los hayas otorgado a Apps Script en general.

2.  **Crear un Nuevo Despliegue**:
    *   En la esquina superior derecha del editor de Apps Script, haz clic en el botón "Desplegar".
    *   Selecciona "Nuevo despliegue".

3.  **Configurar el Despliegue**:
    *   Al lado de "Seleccionar tipo" (un icono de engranaje), haz clic y elige "Aplicación web".
    *   En el campo "Descripción", puedes escribir algo como "Versión inicial - Sistema de Eventos".
    *   En "Ejecutar como": selecciona **Yo ([tu dirección de correo])**.
    *   En "Quién tiene acceso": selecciona **Cualquier usuario**. (Si quieres restringirlo solo a usuarios de tu dominio de Google Workspace, puedes elegir esa opción, pero para pruebas iniciales "Cualquier usuario" es más sencillo).

4.  **Desplegar**:
    *   Haz clic en el botón "Desplegar".
    *   Después de unos momentos, te proporcionará una **URL de la aplicación web**. ¡Esta es la URL que usarás para acceder a tu sistema! Cópiala y guárdala.

## Parte 5: ¡Probar!

1.  Abre la **URL de la aplicación web** que copiaste en el paso anterior en tu navegador.
2.  Deberías ver la interfaz del Sistema de Gestión de Eventos.
3.  Sigue el `TEST_PROTOCOL.md` para verificar que todo funciona correctamente.

¡Felicidades! Has desplegado el Sistema de Gestión de Eventos CECAN.

## Solución de Problemas Comunes

*   **"Script sin autorización para realizar esa acción"**: Asegúrate de haber ejecutado `doGet` como se indica en la Parte 4, Paso 1 y haber concedido todos los permisos. También verifica que en el despliegue, "Ejecutar como" esté configurado como "Yo".
*   **Errores al cargar eventos o al registrar**:
    *   Verifica que el `SPREADSHEET_ID` en `Code.gs` sea correcto.
    *   Verifica que el nombre de la pestaña en tu Google Sheet sea exactamente `Eventos`.
    *   Verifica que los encabezados de columna en la Google Sheet sean correctos y estén en el orden especificado.
*   **La aplicación web muestra un error genérico o una página en blanco**: Revisa los registros de ejecución en Apps Script. Ve a "Ejecuciones" en el panel izquierdo del editor de Apps Script para ver si hay mensajes de error detallados.
*   **Problemas con la subida de archivos**: Asegúrate de que el `DRIVE_FOLDER_ID` en `Code.gs` sea correcto y que la carpeta exista y tengas permisos de edición sobre ella.

Si encuentras otros problemas, revisa cuidadosamente cada paso de esta guía.
