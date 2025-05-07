// src/app/features/create-contract/create-contract.component.ts
import { Component, OnDestroy } from '@angular/core';
import { WalletService } from '../../../../core/services/wallet.service'; // Asegúrate que la ruta sea correcta
import { CompilerService, CompilationResult } from '../../../../core/services/compiler.service'; // Asegúrate que la ruta sea correcta
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
// Importa ethers si planeas usarlo para el despliegue después
// import { ethers } from 'ethers'; 

@Component({
  selector: 'app-create-contract',
  standalone: false,
  templateUrl: './create-contract.component.html',
  styleUrls: ['./create-contract.component.css']
})
export class CreateContractComponent implements OnDestroy {
  // Propiedades para el archivo
  selectedFile: File | undefined;
  soliditySourceCode: string | undefined;
  fileName: string | undefined;

  // Estado y resultados de la compilación
  compilationResult: CompilationResult | null = null; // Guarda ABI, Bytecode, contractName
  compilationError: string | null = null;
  isCompiling: boolean = false;

  // Propiedades para el estado del despliegue (usadas en el HTML)
  isDeploying: boolean = false;
  deployedContractAddress: string | null = null;
  deploymentError: string | null = null;

  private compilationSubscription: Subscription | undefined;

  constructor(
    private compilerService: CompilerService,
    private walletService: WalletService // Inyecta WalletService
  ) {}

  onFileSelectedFromUpload(file: File | undefined): void {
    this.selectedFile = file;
    this.soliditySourceCode = undefined;
    this.fileName = undefined;
    this.compilationResult = null;
    this.compilationError = null;
    this.deployedContractAddress = null; // Resetea estado de despliegue
    this.deploymentError = null;       // Resetea estado de despliegue
    this.isDeploying = false;          // Resetea estado de despliegue

    if (file) {
      this.fileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.soliditySourceCode = e.target?.result as string;
        console.log(`Contenido del archivo ${this.fileName} cargado.`);
        if (this.soliditySourceCode && this.fileName) {
          this.handleCompileContract(); // Compila automáticamente
        } else {
          Swal.fire('Error Interno', 'No se pudo obtener el contenido del archivo.', 'error');
        }
      };
      reader.onerror = (e) => {
        console.error('Error al leer el archivo:', e);
        Swal.fire('Error de Archivo', 'No se pudo leer el archivo seleccionado.', 'error');
        this.selectedFile = undefined;
      };
      reader.readAsText(file);
    }
  }

  handleCompileContract(): void {
    if (!this.soliditySourceCode || !this.fileName) {
      Swal.fire('Archivo no Preparado', 'El contenido del archivo no está listo.', 'warning');
      return;
    }

    this.isCompiling = true;
    this.compilationResult = null;
    this.compilationError = null;
    this.deployedContractAddress = null; // Resetea estado de despliegue
    this.deploymentError = null;       // Resetea estado de despliegue
    this.isDeploying = false;          // Resetea estado de despliegue


    if (this.compilationSubscription) {
      this.compilationSubscription.unsubscribe();
    }

    this.compilationSubscription = this.compilerService.compile(this.fileName, this.soliditySourceCode)
      .subscribe({
        next: (result) => {
          this.compilationResult = result; // ABI y Bytecode guardados
          console.log('Resultado de compilación:', this.compilationResult);
          this.isCompiling = false;

          let messageHtml = `Contrato: <strong>${result.contractName}</strong>`;
          messageHtml += `<br><p>El ABI y Bytecode están listos. Completa el formulario de abajo para desplegar.</p>`;
          if (result.warnings && result.warnings.length > 0) {
            messageHtml += '<br><strong>Advertencias:</strong><pre style="text-align: left; font-size: 0.8em;">' +
                           result.warnings.join("\n") +
                           '</pre>';
          }
          Swal.fire({
            icon: 'success',
            title: '¡Compilación Exitosa!',
            html: messageHtml,
            confirmButtonText: '¡Entendido!',
          });
        },
        error: (error: Error) => {
          console.error('Error de compilación en componente:', error);
          this.compilationError = error.message;
          this.isCompiling = false;
          Swal.fire('Error de Compilación', this.compilationError, 'error');
        }
      });
  }

  /**
   * Se llama cuando <app-form> emite el evento (formSubmitted).
   * Recibe los datos del formulario y prepara el despliegue (a implementar).
   * @param formData Datos del formulario: { contractName: string, blockchain: string, description: string }
   */
  onSubmitFromAppForm(formData: any): void { // No necesita ser async todavía
    console.log("Datos recibidos del app-form:", formData);

    if (!this.compilationResult) {
      Swal.fire('Atención', 'Primero debes subir y compilar un archivo .sol.', 'warning');
      return; // Salimos si no hay nada compilado
    }

    // --- AQUÍ EMPEZARÍA LA LÓGICA DE DESPLIEGUE (PRÓXIMO PASO) ---

    console.log('Formulario enviado. Preparando para despliegue...');
    console.log('Datos del formulario:', formData);
    console.log('Datos de compilación:', this.compilationResult);

    // 1. Verificar conexión de Wallet y obtener Signer (del WalletService)
    // 2. Verificar red seleccionada (formData.blockchain) vs red de MetaMask
    // 3. Crear ContractFactory con ABI, Bytecode y Signer
    // 4. Llamar a factory.deploy()
    // 5. Manejar estados (isDeploying, deployedContractAddress, deploymentError)
    // 6. Mostrar notificaciones con SweetAlert
    // 7. Llamar a la función de Firebase para guardar la referencia

    // Por ahora, solo mostramos un mensaje indicando que estamos listos para el siguiente paso
    Swal.fire(
      'Listo para Desplegar',
      `Se usarán los datos del formulario y el contrato compilado "${this.compilationResult.contractName}". El siguiente paso es implementar la lógica de despliegue.`,
      'info',
    );

    // this.desplegarContrato(formData); // Llamaríamos a la función de despliegue real aquí
  }

  // async desplegarContrato(formData: any) {
  //   // ... Lógica de despliegue que implementaremos ...
  // }

  ngOnDestroy(): void {
    if (this.compilationSubscription) {
      this.compilationSubscription.unsubscribe();
    }
  }
}
