const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors");

// Inicializa Firebase Admin SDK
admin.initializeApp();

// Configura CORS - ¡IMPORTANTE: Ajusta los orígenes permitidos para producción!
// Reemplaza 'YOUR_APP_URL' con la URL de tu app desplegada (o usa '*' para desarrollo)
const corsHandler = cors({origin: ["http://localhost:4200", "https://rubensuarez22.github.io"]}); // Ajusta según tus URLs

/**
 * Cloud Function HTTP (JavaScript) para añadir datos de un contrato a Firestore.
 * Espera un método POST con un cuerpo JSON que contenga:
 * { userAddress, contractAddress, name, description, network }
 */
exports.addContract = functions.https.onRequest((request, response) => {
  // Aplica el middleware de CORS
  corsHandler(request, response, async () => {
    // Solo permitir método POST
    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    // Obtener datos del cuerpo de la solicitud
    const {userAddress, contractAddress, name, description, network} =
      request.body;

    // --- Validación Básica ---
    if (!userAddress || !contractAddress || !name || !network) {
      functions.logger.error("Missing required fields", request.body);
      response.status(400).send("Missing required fields.");
      return;
    }

    // Validación simple de formato (opcional, mejora según necesidad)
    if (
      !/^0x[a-fA-F0-9]{40}$/.test(userAddress) ||
      !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)
    ) {
      functions.logger.error("Invalid address format", request.body);
      response.status(400).send("Invalid address format.");
      return;
    }
    // --- Fin Validación ---

    // --- Lógica para guardar en Firestore ---
    try {
      const contractsRef = admin.firestore().collection("contracts");
      const docRef = await contractsRef.add({
        userAddress: userAddress.toLowerCase(), // Guardar en minúsculas
        contractAddress: contractAddress.toLowerCase(),
        name: name,
        description: description || "", // Asegurar que no sea undefined
        network: network,
        createdAt: admin.firestore.FieldValue.serverTimestamp(), // Hora del servidor
      });

      functions.logger.info(`Contract added with ID: ${docRef.id}`, {
        structuredData: true,
      });
      response
          .status(201)
          .send({message: "Contract added successfully", id: docRef.id});
    } catch (error) {
      functions.logger.error("Error adding contract to Firestore", error);
      response.status(500).send("Internal Server Error");
    }
    // --- Fin Lógica Firestore ---
  }); // Fin corsHandler
}); // Fin exports.addContract