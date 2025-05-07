// src/app/features/create-contract/create-contract.component.ts (o tu ruta)
import { Component } from '@angular/core';
// Asegúrate que la ruta al CompilerService y su interfaz CompilationResult sea correcta
import { CompilerService, CompilationResult } from '../../../../core/services/compiler.service';

@Component({
  selector: 'app-create-contract',
  standalone: false, // Lo tienes como false, lo cual está bien si no es un componente standalone
  templateUrl: './create-contract.component.html',
  styleUrls: ['./create-contract.component.css'] // Corregido de styleUrl a styleUrls
})
export class CreateContractComponent {

  // Propiedades para manejar el archivo y la compilación
  selectedFile: File | undefined;
  soliditySourceCode: string | undefined;
  fileName: string | undefined;

  compilationResult: CompilationResult | null = null;
  compilationError: string | null = null;
  isCompiling: boolean = false;

  // Aquí podrías tener otros campos del formulario que vengan de <app-form>
  // por ejemplo, si <app-form> emite un objeto con el nombre del contrato, descripción, etc.

  constructor(private compilerService: CompilerService) {} // Inyecta el servicio

  /**
   * Método que se llama cuando app-file-upload emite un archivo.
   * @param file El archivo .sol seleccionado por el usuario.
   */
  onFileUploadedFromChild(file: File | undefined): void {
    this.selectedFile = file;
    this.soliditySourceCode = undefined; // Resetea el código fuente anterior
    this.fileName = undefined; // Resetea el nombre de archivo anterior
    this.compilationResult = null; // Resetea resultados de compilación anteriores
    this.compilationError = null; // Resetea errores anteriores

    if (file) {
      this.fileName = file.name;
      const reader = new FileReader(); // Objeto para leer el contenido del archivo

      // Callback que se ejecuta cuando el archivo se ha leído
      reader.onload = (e) => {
        this.soliditySourceCode = e.target?.result as string;
        console.log(`Contenido del archivo ${this.fileName} cargado.`);
        // Opcional: podrías llamar a handleCompileContract() aquí si quieres autocompilar
        // o esperar a que el usuario presione un botón explícito.
      };

      // Callback para manejar errores durante la lectura del archivo
      reader.onerror = (e) => {
        console.error('Error al leer el archivo:', e);
        this.compilationError = 'Error al leer el archivo seleccionado.';
        this.selectedFile = undefined; // Resetea el archivo seleccionado en caso de error
      };

      reader.readAsText(file); // Lee el archivo como texto plano
    }
  }

  /**
   * Método para iniciar la compilación del contrato.
   * Se puede llamar desde un botón en la plantilla.
   */
  async handleCompileContract(): Promise<void> {
    if (!this.soliditySourceCode || !this.fileName) {
      this.compilationError = 'Por favor, selecciona un archivo .sol y asegúrate de que se haya leído correctamente.';
      // Podrías mostrar una alerta o un mensaje más visible al usuario.
      return;
    }

    this.isCompiling = true; // Activa el estado de "compilando"
    this.compilationResult = null; // Limpia resultados anteriores
    this.compilationError = null; // Limpia errores anteriores

    try {
      // Llama al método compile del servicio
      this.compilationResult = await this.compilerService.compile(this.fileName, this.soliditySourceCode);
      console.log('Resultado de compilación en CreateContractComponent:', this.compilationResult);
      // El resultado (ABI y Bytecode) está ahora en this.compilationResult
      // y se mostrará en la plantilla si has bindeado las propiedades.
    } catch (error: any) {
      console.error('Error de compilación en CreateContractComponent:', error);
      this.compilationError = error.message || 'Ocurrió un error inesperado durante la compilación.';
    } finally {
      this.isCompiling = false; // Desactiva el estado de "compilando"
    }
  }
}