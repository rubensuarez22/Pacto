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
}

// Datos completos a enviar al backend
export interface SaveRequestPayload {
  contractData: ContractReferenceDataForBackend;
  signedMessage: string; // Mensaje firmado
  signature: string;     // Firma digital
  userAddress: string;   // Dirección que afirma haber firmado
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
   * @returns Observable con la respuesta del backend.
   */
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
