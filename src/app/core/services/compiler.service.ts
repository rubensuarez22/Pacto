// src/app/core/services/compiler.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Interfaz para el resultado esperado de la compilación
export interface CompilationResult {
  abi: any[];
  bytecode: string;
  contractName: string;
  warnings?: string[];
  // Para manejar errores específicos del backend si vienen en el cuerpo JSON
  message?: string; // Mensaje general (éxito o error)
  errors?: string;  // Errores de compilación específicos como una cadena
}

@Injectable({
  providedIn: 'root'
})
export class CompilerService {
  // URL de tu servidor Node.js local para compilación
  private compileServerUrl = 'http://localhost:3000/compile';

  constructor(private http: HttpClient) {}

  /**
   * Envía el código fuente de Solidity y el nombre del archivo al backend local para compilación.
   * @param fileName El nombre del archivo .sol (ej. "MiContrato.sol")
   * @param sourceCode El contenido completo del archivo .sol como una cadena
   * @returns Un Observable con el resultado de la compilación o un error.
   */
  compile(fileName: string, sourceCode: string): Observable<CompilationResult> {
    console.log(`CompilerService: Enviando ${fileName} para compilar al servidor Node.js en ${this.compileServerUrl}...`);

    const payload = {
      fileName: fileName,
      sourceCode: sourceCode,
    };

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    };

    return this.http.post<CompilationResult>(this.compileServerUrl, payload, httpOptions)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('CompilerService: Error al llamar al servidor de compilación:', error);
          
          let errorMessage = 'Error desconocido durante la compilación remota.';
          
          if (error.error instanceof ErrorEvent) {
            // Error del lado del cliente o de red.
            errorMessage = `Error de cliente/red: ${error.error.message}`;
          } else if (error.error && typeof error.error === 'object') {
            // El backend devolvió un código de error y un cuerpo JSON.
            if (error.error.message && error.error.errors) {
              // Errores de compilación específicos devueltos por nuestro backend
              errorMessage = `${error.error.message}\nDetalles: ${error.error.errors}`;
            } else if (error.error.error) {
              // Error general del backend (ej. el string que enviamos con res.status(500).send())
              errorMessage = `Error del servidor: ${error.error.error}`;
            } else if (error.error.message) {
               errorMessage = `Respuesta del servidor: ${error.error.message}`;
            } else if (typeof error.error === 'string') {
              // A veces el cuerpo del error es solo una cadena
              errorMessage = `Error del servidor: ${error.error}`;
            }
          } else if (error.message) {
            // Otros errores HTTP (ej. si el servidor no está corriendo, error.message podría ser útil)
            errorMessage = `Error HTTP: ${error.status} - ${error.message}`;
          }
          
          // Devuelve un nuevo observable que emite el error para que el componente lo maneje.
          return throwError(() => new Error(errorMessage));
        })
      );
  }
}
