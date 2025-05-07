# Proyecto Pacto - Gestión de Contratos Inteligentes (Prototipo Universitario)

Este proyecto es un prototipo para gestionar contratos inteligentes, permitiendo la compilación de archivos `.sol`, el despliegue en la red de pruebas Sepolia y el guardado de referencias usando un backend local Node.js y Firebase Firestore.

**Tecnologías Principales:**

* **Frontend:** Angular
* **Interacción Blockchain:** ethers.js, MetaMask
* **Compilación Solidity:** Node.js (Express) + solc-js (Servidor Local)
* **Base de Datos (Referencias):** Google Firestore
* **Verificación (Guardado):** Firma de Mensajes (MetaMask) + Verificación en Backend

---

## 1. Prerrequisitos

Asegúrate de tener instalado lo siguiente en tu máquina:

1.  **Node.js y npm:** Necesarios para ejecutar tanto el frontend Angular como el backend Node.js. Se recomienda una versión LTS reciente (ej. v18, v20 o superior). Puedes descargarlo desde [nodejs.org](https://nodejs.org/). Verifica tu instalación con `node -v` y `npm -v`.
2.  **Angular CLI:** La interfaz de línea de comandos de Angular. Instálala globalmente si no la tienes: `npm install -g @angular/cli`.
3.  **MetaMask:** La extensión de navegador para interactuar con la blockchain. Descárgala desde [metamask.io](https://metamask.io/).
4.  **Git:** Para clonar el repositorio (si aplica).

---

## 2. Configuración del Backend Local (Servidor de Compilación y Guardado)

Este servidor Node.js se encarga de compilar los archivos `.sol` y de verificar las firmas antes de guardar las referencias de los contratos en Firestore.

1.  **Obtener el Código del Backend:**
    * Clona el repositorio o copia la carpeta del backend (ej. `pacto-compiler-server`) a tu máquina.
2.  **Navegar a la Carpeta del Backend:**
    * Abre una terminal o línea de comandos y navega hasta la carpeta del backend:
        ```bash
        cd ruta/a/tu/pacto-compiler-server
        ```
3.  **Instalar Dependencias del Backend:**
    * Ejecuta el siguiente comando para instalar `express`, `cors`, `solc`, `body-parser`, `firebase-admin`, y `ethers`:
        ```bash
        npm install
        ```
        *(Nota: `npm install` leerá el `package.json` del backend, que debe listar estas dependencias).*
4.  **Configurar Firebase Admin SDK:**
    * Necesitas un archivo de credenciales (clave privada) para que el servidor Node.js pueda interactuar con tu proyecto Firebase como administrador.
    * Ve a la [Consola de Firebase](https://console.firebase.google.com/) -> Tu Proyecto -> Project settings (⚙️) -> Service accounts.
    * Haz clic en "Generate new private key" y guarda el archivo JSON descargado **dentro de la carpeta de tu servidor backend** (ej. `pacto-compiler-server/`). Nómbralo `firebase-admin-key.json`.
    * **¡IMPORTANTE!** Asegúrate de que este archivo `firebase-admin-key.json` **NO** se suba a repositorios públicos (añádelo a `.gitignore` si usas Git para el backend).
    * Verifica que la ruta en el archivo `server.js` sea correcta: `const serviceAccount = require("./firebase-admin-key.json");`
5.  **Verificar Configuración de CORS:**
    * Abre el archivo `server.js`.
    * Localiza la variable `allowedOrigins` dentro de `corsOptions`. Asegúrate de que incluya `"http://localhost:4200"` para permitir las solicitudes desde tu Angular local.
        ```javascript
        const allowedOrigins = [
          "http://localhost:4200",
          // Añade otras URLs si es necesario (ej. tu URL de GitHub Pages)
          "[https://rubensuarez22.github.io](https://rubensuarez22.github.io)",
        ];
        ```

---

## 3. Configuración del Frontend (Aplicación Angular)

1.  **Obtener el Código del Frontend:**
    * Clona el repositorio o copia la carpeta principal del proyecto Angular (la que contiene `angular.json`).
2.  **Navegar a la Carpeta del Frontend:**
    * Abre **otra** terminal y navega hasta la carpeta raíz de tu proyecto Angular:
        ```bash
        cd ruta/a/tu/proyecto-angular
        ```
3.  **Instalar Dependencias del Frontend:**
    * Ejecuta:
        ```bash
        npm install
        ```
4.  **Configurar Firebase:**
    * Asegúrate de que los archivos `src/environments/environment.ts` y `src/environments/environment.prod.ts` contengan la configuración de tu proyecto Firebase (el objeto `firebase` con `apiKey`, `authDomain`, `projectId`, etc.). Puedes obtener esta configuración desde la Consola de Firebase -> Project settings (⚙️) -> Tus apps -> Configuración (si ya registraste la app web).
5.  **Configurar URL del Backend Local:**
    * Abre el archivo del servicio que llama a tu backend Node.js local. Probablemente sea `src/app/core/services/compiler.service.ts` (para la compilación) y `src/app/core/services/contract-backend.service.ts` (para el guardado).
    * Verifica que la variable `localBackendUrl` (o similar) apunte a la dirección correcta de tu servidor local, que por defecto es `http://localhost:3000`.
        ```typescript
        // Ejemplo en contract-backend.service.ts
        private localBackendUrl = 'http://localhost:3000';
        // Ejemplo en compiler.service.ts
        private compileServerUrl = 'http://localhost:3000/compile';
        ```

---

## 4. Configuración de MetaMask

1.  **Instalar:** Asegúrate de tener la extensión MetaMask instalada y configurada con una cuenta.
2.  **Seleccionar Red:** Abre MetaMask y selecciona la red **Sepolia Testnet**.
3.  **Obtener Sepolia ETH:** Necesitarás ETH de prueba en la red Sepolia para pagar el gas del despliegue. Busca "Sepolia ETH faucet" en Google para encontrar sitios que regalan ETH de prueba para esta red.

---

## 5. Ejecutar la Aplicación Completa

Debes tener **dos terminales abiertas**: una para el backend y otra para el frontend.

1.  **Iniciar el Servidor Backend:**
    * En la terminal que está dentro de la carpeta `pacto-compiler-server`, ejecuta:
        ```bash
        node server.js
        ```
    * Deberías ver el mensaje `Servidor escuchando en http://localhost:3000`. Déjala corriendo.
2.  **Iniciar la Aplicación Frontend:**
    * En la terminal que está dentro de la carpeta de tu proyecto Angular, ejecuta:
        ```bash
        ng serve -o
        ```
    * Esto compilará la aplicación Angular, iniciará un servidor de desarrollo (usualmente en `http://localhost:4200`) y la abrirá en tu navegador.

---

## 6. Cómo Usar la Aplicación

1.  **Conectar Wallet:** Haz clic en "Conectarse" en el header y aprueba la conexión en MetaMask.
2.  **Navegar:** Ve a la sección "Crear Contrato".
3.  **Subir Archivo:** Selecciona o arrastra un archivo `.sol` válido. La compilación debería iniciarse automáticamente.
4.  **Compilación:** Espera el pop-up de SweetAlert indicando éxito o error en la compilación.
5.  **Completar Formulario:** Rellena el nombre del contrato (para tu app), descripción y selecciona la red "Sepolia Testnet".
6.  **Desplegar:** Haz clic en el botón "Desplegar Contrato".
7.  **Firmar Mensaje:** MetaMask te pedirá firmar un mensaje para verificar tu acción de guardado. Haz clic en "Firmar".
8.  **Confirmar Transacción:** MetaMask te pedirá confirmar la transacción de despliegue (pagando el gas). Haz clic en "Confirmar".
9.  **Esperar:** Verás un pop-up de "Desplegando...". Espera la confirmación de la red.
10. **Verificar:** Deberías ver un pop-up de "¡Despliegue y Guardado Exitosos!". Revisa tu base de datos Firestore para ver la nueva entrada.

---

## 7. Posibles Problemas (Troubleshooting)

* **Error `Origen no permitido por CORS`:** Asegúrate de que la URL desde la que accedes a tu app Angular (ej. `http://localhost:4200`) esté incluida en la lista `allowedOrigins` dentro del archivo `server.js` de tu backend Node.js y reinicia el servidor Node.js.
* **Error `ECONNREFUSED` al compilar/guardar:** Asegúrate de que tu servidor Node.js (`node server.js`) esté corriendo en la otra terminal.
* **Error `500 Internal Server Error` del backend:** Revisa la consola de la terminal donde corre `node server.js` para ver mensajes de error más detallados (ej. problemas con `solc`, Firestore, verificación de firma, etc.).
* **Error `MetaMask no está instalado`:** Instala la extensión MetaMask.
* **Error `Red Incorrecta`:** Cambia la red en MetaMask a Sepolia Testnet.
* **Error `Fondos Insuficientes`:** Consigue más Sepolia ETH de un faucet.
* **Error al inicializar Firebase Admin SDK:** Verifica que el archivo `firebase-admin-key.json` esté en la carpeta correcta y sea válido.
