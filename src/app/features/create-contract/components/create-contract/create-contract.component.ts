// src/app/features/create-contract/create-contract.component.ts
import { Component, OnDestroy, NgZone } from '@angular/core'; // Añade NgZone
import { WalletService } from '../../../../core/services/wallet.service';
import { CompilerService, CompilationResult } from '../../../../core/services/compiler.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { ethers } from 'ethers'; // Importa ethers

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

  compilationResult: CompilationResult | null = null;
  compilationError: string | null = null;
  isCompiling: boolean = false;

  isDeploying: boolean = false;
  deployedContractAddress: string | null = null;
  deploymentError: string | null = null;

  private compilationSubscription: Subscription | undefined;

  // Sepolia Chain ID (como número BigInt)
  private readonly SEPOLIA_CHAIN_ID = 11155111n;

  constructor(
    private compilerService: CompilerService,
    private walletService: WalletService,
    private ngZone: NgZone // Inyecta NgZone para actualizaciones desde callbacks de ethers
  ) {}

  onFileSelectedFromUpload(file: File | undefined): void {
    this.selectedFile = file;
    this.soliditySourceCode = undefined;
    this.fileName = undefined;
    this.compilationResult = null;
    this.compilationError = null;
    this.deployedContractAddress = null;
    this.deploymentError = null;
    this.isDeploying = false;

    if (file) {
      this.fileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.soliditySourceCode = e.target?.result as string;
        console.log(`Contenido del archivo ${this.fileName} cargado.`);
        if (this.soliditySourceCode && this.fileName) {
          this.handleCompileContract();
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
    this.deployedContractAddress = null;
    this.deploymentError = null;
    this.isDeploying = false;

    if (this.compilationSubscription) {
      this.compilationSubscription.unsubscribe();
    }

    this.compilationSubscription = this.compilerService.compile(this.fileName, this.soliditySourceCode)
      .subscribe({
        next: (result) => {
          this.compilationResult = result;
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
   * Inicia el proceso de despliegue.
   * @param formData Datos del formulario: { contractName: string, blockchain: string, description: string }
   */
  async onSubmitFromAppForm(formData: any): Promise<void> {
    console.log("onSubmitFromAppForm llamado con:", formData);

    // 1. Verificar si la compilación está lista
    if (!this.compilationResult || !this.compilationResult.abi || !this.compilationResult.bytecode) {
      Swal.fire('Error', 'Datos de compilación no encontrados. Por favor, compila un contrato primero.', 'error');
      return;
    }

    // 2. Verificar conexión de Wallet y obtener Signer
    let signer = this.walletService.signer;
    if (!signer) {
      try {
        console.log("Intentando conectar wallet...");
        await this.walletService.connectWallet();
        signer = this.walletService.signer; // Intenta obtener el signer de nuevo
        if (!signer) {
          Swal.fire('Error', 'Conexión de wallet fallida o cancelada. No se puede desplegar.', 'error');
          return;
        }
        console.log("Wallet conectada exitosamente.");
      } catch (e) {
        Swal.fire('Error', 'Error al conectar la wallet. No se puede desplegar.', 'error');
        return;
      }
    }

    // 3. Verificar Red (Solo Sepolia)
    try {
        // Accedemos al provider a través del signer
        if (!signer.provider) {
            throw new Error("Signer no tiene un provider asociado.");
        }
        const network = await signer.provider.getNetwork();
        console.log("Red actual de MetaMask:", network.name, network.chainId);

        if (network.chainId !== this.SEPOLIA_CHAIN_ID) {
            Swal.fire(
                'Red Incorrecta',
                'Por favor, cambia tu red en MetaMask a Sepolia Testnet para poder desplegar este contrato.',
                'warning'
            );
            return; // Detener el despliegue
        }

        // Opcional: Verificar si la selección del formulario coincide (aunque solo permitimos Sepolia)
        if (formData.blockchain !== 'sepolia') {
             console.warn("La selección del formulario no es Sepolia, pero se procederá porque es la única red soportada.");
             // Podrías forzar el despliegue a Sepolia o mostrar un error si quieres ser más estricto.
        }

    } catch (error: any) {
        console.error("Error obteniendo la red:", error);
        Swal.fire('Error', `No se pudo verificar la red conectada: ${error.message}`, 'error');
        return;
    }


    // --- INICIO DEL PROCESO DE DESPLIEGUE ---
    this.isDeploying = true;
    this.deployedContractAddress = null;
    this.deploymentError = null;

    console.log("Iniciando despliegue en Sepolia...");
    console.log("ABI:", this.compilationResult.abi);
    // console.log("Bytecode:", this.compilationResult.bytecode); // Puede ser muy largo para loguear completo

    try {
      // 4. Crear ContractFactory
      const factory = new ethers.ContractFactory(
        this.compilationResult.abi,
        this.compilationResult.bytecode,
        signer // Usamos el signer obtenido
      );

      // 5. Llamar a factory.deploy() y mostrar pop-up de espera
      // Si tu contrato necesitara argumentos en el constructor, se pasarían aquí.
      // const contract = await factory.deploy(arg1, arg2);
      console.log("Enviando transacción de despliegue...");
      const contract = await factory.deploy();

      Swal.fire({
        title: 'Desplegando Contrato',
        text: `Enviando transacción... Hash: ${contract.deploymentTransaction()?.hash}. Por favor, espera la confirmación en MetaMask y en la red.`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // 6. Esperar confirmación
      const deploymentReceipt = await contract.waitForDeployment();
      // Necesitamos esperar un poco más para asegurar que esté disponible
      // await deploymentReceipt.wait(1); // Espera 1 confirmación adicional (opcional)
      
      const contractAddress = await deploymentReceipt.getAddress();

      // 7. Actualizar estado y mostrar éxito
      this.ngZone.run(() => { // Asegurar actualización en zona Angular
        this.deployedContractAddress = contractAddress;
        this.isDeploying = false;
      });
      Swal.close(); // Cierra el pop-up de "Desplegando"
      Swal.fire(
        '¡Despliegue Exitoso!',
        `Contrato "${this.compilationResult.contractName}" desplegado en Sepolia.\nDirección: ${this.deployedContractAddress}`,
        'success'
      );
      console.log(`Contrato desplegado exitosamente en: ${this.deployedContractAddress}`);

      // 8. (Futuro) Llamar a Firebase para guardar la referencia
      // this.guardarReferenciaEnFirestore(formData, this.deployedContractAddress);

    } catch (error: any) {
      console.error("Error durante el despliegue:", error);
      let errorMessage = `Error durante el despliegue: ${error.message || "Error desconocido"}`;
      if (error.code === 4001 || error.code === "ACTION_REJECTED") { // User rejected transaction
        errorMessage = "Transacción de despliegue rechazada por el usuario.";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Fondos insuficientes en la cuenta para cubrir el costo del gas.";
      }
      // Asegurar actualización en zona Angular
      this.ngZone.run(() => {
        this.deploymentError = errorMessage;
        this.isDeploying = false;
      });
      Swal.close(); // Cierra el pop-up de "Desplegando" si estaba abierto
      Swal.fire('Error de Despliegue', errorMessage, 'error');
    }
    // El finally no es necesario aquí porque el catch ya maneja el error y el success maneja el éxito.
    // finally {
    //   this.ngZone.run(() => { this.isDeploying = false; });
    // }
  }

  // async guardarReferenciaEnFirestore(formData: any, contractAddr: string) {
  //   const userAddr = this.walletService.getCurrentAddress();
  //   if (!userAddr) return;
  //   console.log("Guardando referencia en Firestore:", {
  //     nombreApp: formData.contractName,
  //     descripcion: formData.description,
  //     address: contractAddr,
  //     network: 'sepolia', // Forzado a Sepolia por ahora
  //     user: userAddr,
  //     contractNameSol: this.compilationResult?.contractName
  //   });
  //   // Lógica para llamar a la Cloud Function 'addContract'
  // }


  ngOnDestroy(): void {
    if (this.compilationSubscription) {
      this.compilationSubscription.unsubscribe();
    }
  }
}
