// src/app/core/services/contract-backend.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// --- Interfaces (puedes moverlas a un archivo .model.ts) ---
// Datos del contrato (sin userAddress, ya que se envía por separado)
export interface ContractReferenceDataForBackend {
  contractAddress: string;
  name: string; // Nombre dado en el formulario de la app
  description: string;
  network: string; // Ej. 'sepolia'
  contractNameSol?: string; // Nombre real del contrato del .sol (opcional)
  abi: any[];
  firestoreId?: string;
}
export interface DeleteRequestPayload { // Nueva interfaz para claridad
  signedMessage: string;
  signature: string;
  userAddress: string; // La dirección que firmó
}
// Datos completos a enviar al backend
export interface SaveRequestPayload {
  contractData: ContractReferenceDataForBackend;
  signedMessage: string; // Mensaje firmado
  signature: string;     // Firma digital
  userAddress: string;   // Dirección que afirma haber firmado
}
export interface DeleteContractResponse { // Nueva interfaz para claridad
  message: string;
}

// Respuesta esperada del backend
export interface SaveContractResponse {
  message: string;
  firestoreId: string; // ID del documento guardado por el backend
}
// --- Fin Interfaces ---

@Injectable({
  providedIn: 'root'
})
export class ContractBackendService {
  // URL de tu servidor Node.js local
  private localBackendUrl = 'http://localhost:3000'; // ¡Asegúrate que el puerto sea correcto!

  constructor(private http: HttpClient) { }

  /**
   * Llama al backend local para verificar la firma y guardar la referencia del contrato.
   * @param payload Los datos del contrato, mensaje firmado, firma y dirección del usuario.
   * @param docId
   * @returns Observable con la respuesta del backend.
   */

  deleteContractReference(docId: string, payload: DeleteRequestPayload): Observable<DeleteContractResponse> {
    const deleteUrl = `${this.localBackendUrl}/user-contracts/${docId}`;
    console.log(`ContractBackendService: Solicitando borrar ${docId} para ${payload.userAddress} en ${deleteUrl}`);
    console.log(`ContractBackendService: Pidiendo borrar ${docId} para ${payload.userAddress}`);
    console.log(`>>> DELETE_DEBUG: 4. Intentando llamada HTTP DELETE a: ${deleteUrl} con payload:`, payload); // <-- AÑADIR

    // ¡IMPORTANTE! La petición DELETE con cuerpo no es estándar y puede requerir configuración
    // especial en el servidor o ser bloqueada por proxies. Una alternativa común es
    // enviar estos datos como headers o usar un método POST a una URL tipo /user-contracts/:docId/delete
    // Aquí usamos la opción con body que es más fácil en Express con body-parser:
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      body: payload // El cuerpo se añade a las opciones para DELETE
    };

    return this.http.delete<DeleteContractResponse>(deleteUrl, httpOptions)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error(`ContractBackendService: Error borrando la referencia ${docId}:`, error);
          // Formatear error como en los otros métodos
          let errorMessage = 'Error desconocido al borrar la referencia.';
          if (error.error && typeof error.error === 'object') {
            errorMessage = `Error del servidor: ${error.error.error || error.error.message || 'Error no especificado.'}`;
          } else if (error.error && typeof error.error === 'string') {
            errorMessage = `Error del servidor: ${error.error}`;
          } else if (error.message) {
            errorMessage = `Error de red/HTTP: ${error.status} - ${error.message}`;
          }
          return throwError(() => new Error(errorMessage));
        })
      );
  }
  saveVerifiedContractReference(payload: SaveRequestPayload): Observable<SaveContractResponse> {
    const saveUrl = `${this.localBackendUrl}/save-contract-reference`;
    console.log("ContractBackendService: Enviando datos a backend local:", saveUrl, payload);

    // Valida que el ABI está presente en el payload ANTES de enviarlo (Buena Práctica)
    if (!payload.contractData.abi || payload.contractData.abi.length === 0) {
      console.error("ContractBackendService: Intento de guardar sin ABI!", payload.contractData);
      return throwError(() => new Error("Falta el ABI en los datos del contrato a guardar."));
    }

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    };

    return this.http.post<SaveContractResponse>(saveUrl, payload, httpOptions)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('ContractBackendService: Error llamando a /save-contract-reference:', error);
          // Formatear mensaje de error para el componente
          let errorMessage = 'Error desconocido al guardar la referencia del contrato.';
          if (error.error && typeof error.error === 'object') {
            errorMessage = `Error del servidor: ${error.error.error || error.error.message || 'Error no especificado.'}`;
          } else if (error.error && typeof error.error === 'string') {
            errorMessage = `Error del servidor: ${error.error}`;
          } else if (error.message) {
            errorMessage = `Error de red/HTTP: ${error.status} - ${error.message}`;
          }
          // Devolver un observable que emite el error formateado
          return throwError(() => new Error(errorMessage));
        })
      );
  }
  // --- NUEVO MÉTODO PARA OBTENER CONTRATOS ---
  /**
   * Obtiene la lista de referencias de contratos para una dirección de usuario específica desde el backend.
   * @param userAddress La dirección de la wallet del usuario.
   * @returns Observable con un array de datos de contrato (incluyendo ABI).
   */
  getContractsForUser(userAddress: string): Observable<ContractReferenceDataForBackend[]> {
    // Construye la URL del endpoint GET que creaste en server.js
    const getUrl = `${this.localBackendUrl}/user-contracts/${userAddress}`;
    console.log(`ContractBackendService: Pidiendo contratos para ${userAddress} desde ${getUrl}`);

    // Realiza la petición GET, esperando un array de ContractDataFromBackend
    return this.http.get<ContractReferenceDataForBackend[]>(getUrl)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error(`ContractBackendService: Error obteniendo contratos para ${userAddress}:`, error);

          // Formatear mensaje de error para el componente
          let errorMessage = `No se pudieron cargar los contratos (Error: ${error.status}).`;

          // Si el error es 404 (Not Found), es probable que el usuario no tenga contratos
          // registrados. En este caso, devolvemos un array vacío en lugar de un error.
          if (error.status === 404 || (error.error && typeof error.error === 'object' && error.error.message?.toLowerCase().includes('no contracts found'))) {
            console.log(`No se encontraron contratos para ${userAddress} en el backend.`);
            return of([]); // Devuelve un Observable con un array vacío
          } else if (error.error && typeof error.error === 'object') {
            errorMessage = `Error del servidor: ${error.error.error || error.error.message || 'Error no especificado.'}`;
          } else if (error.error && typeof error.error === 'string') {
            errorMessage = `Error del servidor: ${error.error}`;
          } else if (error.message) {
            errorMessage = `Error de red/HTTP: ${error.status} - ${error.message}`;
          }

          // Para otros errores, propaga el error formateado para que el componente lo maneje
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Podrías añadir aquí el método para llamar al endpoint de compilación también
  // si quieres centralizar TODA la comunicación con el backend aquí.
  // compileRemotely(fileName: string, sourceCode: string): Observable<CompilationResult> {
  //   const compileUrl = `${this.localBackendUrl}/compile`;
  //   // ... lógica similar usando this.http.post ...
  // }
}
