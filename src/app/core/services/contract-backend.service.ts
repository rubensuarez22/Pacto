// src/app/core/services/contract-backend.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// --- Interfaces (puedes moverlas a un archivo .model.ts) ---
// Datos del contrato (sin userAddress, ya que se envía por separado)
export interface ContractReferenceDataForBackend {
  contractAddress: string;
  name: string; // Nombre dado en el formulario de la app
  description: string;
  network: string; // Ej. 'sepolia'
  contractNameSol?: string; // Nombre real del contrato del .sol (opcional)
  abi?: any; // ABI (opcional)
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

  constructor(private http: HttpClient) {}

  /**
   * Llama al backend local para verificar la firma y guardar la referencia del contrato.
   * @param payload Los datos del contrato, mensaje firmado, firma y dirección del usuario.
   * @returns Observable con la respuesta del backend.
   */
  saveVerifiedContractReference(payload: SaveRequestPayload): Observable<SaveContractResponse> {
    const saveUrl = `${this.localBackendUrl}/save-contract-reference`;
    console.log("ContractBackendService: Enviando datos a backend local:", saveUrl, payload);

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

  // Podrías añadir aquí el método para llamar al endpoint de compilación también
  // si quieres centralizar TODA la comunicación con el backend aquí.
  // compileRemotely(fileName: string, sourceCode: string): Observable<CompilationResult> {
  //   const compileUrl = `${this.localBackendUrl}/compile`;
  //   // ... lógica similar usando this.http.post ...
  // }
}
