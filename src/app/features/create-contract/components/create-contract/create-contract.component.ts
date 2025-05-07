// src/app/features/create-contract/create-contract.component.ts
import { Component, OnDestroy } from '@angular/core';
import { WalletService } from '../../../../core/services/wallet.service'; // Aunque no despleguemos ahora, puede ser útil tenerlo
import { CompilerService, CompilationResult } from '../../../../core/services/compiler.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-create-contract',
  standalone: false,
  templateUrl: './create-contract.component.html',
  styleUrls: ['./create-contract.component.css']
})
export class CreateContractComponent implements OnDestroy {
  selectedFile: File | undefined;
  soliditySourceCode: string | undefined;
  fileName: string | undefined;

  // compilationResult guardará el ABI, Bytecode y contractName
  compilationResult: CompilationResult | null = null;
  compilationError: string | null = null; // Para el pop-up de error si es necesario
  isCompiling: boolean = false;

  private compilationSubscription: Subscription | undefined;

  constructor(
    private compilerService: CompilerService
  ) {}

  onFileSelectedFromUpload(file: File | undefined): void {
    this.selectedFile = file;
    this.soliditySourceCode = undefined;
    this.fileName = undefined;
    this.compilationResult = null;
    this.compilationError = null;

    if (file) {
      this.fileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.soliditySourceCode = e.target?.result as string;
        console.log(`Contenido del archivo ${this.fileName} cargado.`);
        // LLAMAR A COMPILAR AUTOMÁTICAMENTE
        if (this.soliditySourceCode && this.fileName) {
          this.handleCompileContract();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error Interno',
            text: 'No se pudo obtener el contenido del archivo para compilar.',
          });
        }
      };
      reader.onerror = (e) => {
        console.error('Error al leer el archivo:', e);
        Swal.fire({
          icon: 'error',
          title: 'Error de Archivo',
          text: 'No se pudo leer el archivo seleccionado.',
        });
        this.selectedFile = undefined;
      };
      reader.readAsText(file);
    }
  }

  handleCompileContract(): void {
    if (!this.soliditySourceCode || !this.fileName) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivo no Preparado',
        text: 'El contenido del archivo no está listo para compilar.',
      });
      return;
    }

    this.isCompiling = true;
    this.compilationResult = null;
    this.compilationError = null;

    if (this.compilationSubscription) {
      this.compilationSubscription.unsubscribe();
    }

    this.compilationSubscription = this.compilerService.compile(this.fileName, this.soliditySourceCode)
      .subscribe({
        next: (result) => {
          this.compilationResult = result; // ABI y Bytecode se guardan aquí
          console.log('Resultado de compilación (Servidor Local):', this.compilationResult);
          this.isCompiling = false;

          let messageHtml = `Contrato: <strong>${result.contractName}</strong>`;
          messageHtml += `<br><p>El ABI y Bytecode están listos. Completa el formulario de abajo para desplegar.</p>`;
          if (result.warnings && result.warnings.length > 0) {
            messageHtml += '<br><br><strong>Advertencias:</strong><pre style="text-align: left; font-size: 0.8em;">' +
                           result.warnings.join("\n") +
                           '</pre>';
          }
          Swal.fire({
            icon: 'success',
            title: '¡Compilación Exitosa!',
            html: messageHtml,
            confirmButtonText: '¡Entendido!',
          });
          // El ABI y Bytecode están en this.compilationResult, listos para cuando
          // el usuario envíe el formulario <app-form> y se decida desplegar.
        },
        error: (error: Error) => {
          console.error('Error de compilación (Servidor Local) en componente:', error);
          this.compilationError = error.message;
          this.isCompiling = false;
          Swal.fire({
            icon: 'error',
            title: 'Error de Compilación',
            text: this.compilationError,
          });
        }
      });
  }

  ngOnDestroy(): void {
    if (this.compilationSubscription) {
      this.compilationSubscription.unsubscribe();
    }
  }
}
