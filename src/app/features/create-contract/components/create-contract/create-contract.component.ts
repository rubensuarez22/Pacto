// src/app/features/contracts/create-contract/create-contract.component.ts
import { Component, OnDestroy, NgZone } from '@angular/core';
import { WalletService } from '../../../../core/services/wallet.service'; // Ajusta ruta
import { CompilerService, CompilationResult } from '../../../../core/services/compiler.service'; // Ajusta ruta
import { ContractBackendService, ContractReferenceDataForBackend, SaveRequestPayload, SaveContractResponse } from '../../../../core/services/contract-backend.service'; // Ajusta ruta
import { Subscription } from 'rxjs'; // No necesitas throwError aquí normalmente
import Swal from 'sweetalert2';
import { ethers } from 'ethers'; // Importa ethers completo

@Component({
  selector: 'app-create-contract',
  standalone: false,
  templateUrl: './create-contract.component.html',
  styleUrls: ['./create-contract.component.css'] // Corregido a styleUrls
})
export class CreateContractComponent implements OnDestroy {
  selectedFile: File | undefined;
  soliditySourceCode: string | undefined;
  fileName: string | undefined;
  // Asegúrate que la interfaz aquí coincida con la de CompilerService
  compilationResult: CompilationResult | null = null;
  compilationError: string | null = null;
  isCompiling: boolean = false;

  isDeploying: boolean = false; // Para mostrar estado de despliegue
  deployedContractAddress: string | null = null; // Dirección final desplegada
  deploymentError: string | null = null; // Error durante despliegue

  isSaving: boolean = false; // Para mostrar estado de guardado en backend

  private compilationSubscription: Subscription | undefined;
  private saveSubscription: Subscription | undefined;

  // Define el Chain ID de Sepolia como BigInt para comparación segura
  private readonly SEPOLIA_CHAIN_ID = 11155111n;

  constructor(
    private compilerService: CompilerService,
    private walletService: WalletService,
    private contractBackendService: ContractBackendService,
    private ngZone: NgZone // NgZone para asegurar actualizaciones de UI desde callbacks async/await
  ) { }

  // --- Manejo de Selección y Compilación de Archivo ---
  onFileSelectedFromUpload(file: File | undefined): void {
    // Resetear todo el estado al seleccionar nuevo archivo
    this.selectedFile = file;
    this.soliditySourceCode = undefined;
    this.fileName = undefined;
    this.compilationResult = null;
    this.compilationError = null;
    this.deployedContractAddress = null;
    this.deploymentError = null;
    this.isCompiling = false;
    this.isDeploying = false;
    this.isSaving = false;

    if (file) {
      this.fileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        // Forzar ejecución dentro de la zona de Angular
        this.ngZone.run(() => {
          this.soliditySourceCode = e.target?.result as string;
          console.log(`Contenido del archivo ${this.fileName} cargado.`);
          if (this.soliditySourceCode && this.fileName) {
            this.handleCompileContract(); // Compila automáticamente
          } else {
            Swal.fire('Error Interno', 'No se pudo obtener el contenido del archivo.', 'error');
          }
        });
      };
      reader.onerror = (e) => {
        this.ngZone.run(() => {
          console.error('Error al leer el archivo:', e);
          Swal.fire('Error de Archivo', 'No se pudo leer el archivo seleccionado.', 'error');
          this.selectedFile = undefined;
        });
      };
      reader.readAsText(file);
    }
  }

  handleCompileContract(): void {
    if (!this.soliditySourceCode || !this.fileName) {
      Swal.fire('Archivo no Preparado', 'El contenido del archivo no está listo.', 'warning');
      return;
    }
    console.log(`CreateContract: Iniciando compilación para ${this.fileName}...`);
    this.isCompiling = true;
    this.compilationResult = null; // Limpiar resultados previos
    this.compilationError = null;
    this.deploymentError = null;
    this.deployedContractAddress = null;

    this.compilationSubscription?.unsubscribe(); // Cancela compilación anterior si existe

    this.compilationSubscription = this.compilerService.compile(this.fileName, this.soliditySourceCode)
      .subscribe({
        next: (result) => {
          this.ngZone.run(() => { // Asegura actualización de UI
            this.compilationResult = result;
            console.log('Resultado de compilación recibido:', this.compilationResult);
            this.isCompiling = false;

            let messageHtml = `Contrato: <strong>${result.contractName}</strong>`;
            messageHtml += `<br><p>El ABI y Bytecode están listos. Completa el formulario para desplegar.</p>`;
            if (result.warnings && result.warnings.length > 0) {
              messageHtml += '<br><strong>Advertencias:</strong><pre style="text-align: left; font-size: 0.8em;">' + result.warnings.join("\n") + '</pre>';
            }
            Swal.fire({ icon: 'success', title: '¡Compilación Exitosa!', html: messageHtml });
          });
        },
        error: (error: Error) => {
          this.ngZone.run(() => { // Asegura actualización de UI
            console.error('Error de compilación en componente:', error);
            this.compilationError = error.message;
            this.isCompiling = false;
            Swal.fire('Error de Compilación', this.compilationError, 'error');
          });
        }
      });
  }

  // --- Método Principal llamado por el Formulario Hijo ---
  // Asume que el hijo <app-contract-form> emite un evento (formSubmitted)="onSubmitFromAppForm($event)"
  // y que $event contiene un objeto con { contractName: '...', description: '...', blockchain: 'sepolia' }
  async onSubmitFromAppForm(formData: { contractName: string, description: string, blockchain: string }): Promise<void> {
    console.log("onSubmitFromAppForm llamado con:", formData);

    // 1. --- Verificaciones iniciales ---
    if (!this.compilationResult?.abi || !this.compilationResult?.bytecode) {
      Swal.fire('Error', 'Compila el contrato primero. Faltan ABI o Bytecode.', 'warning');
      return;
    }

    // Intenta obtener el signer, conectando la wallet si es necesario
    let signer = this.walletService.signer;
    if (!signer) {
      try {
        await this.walletService.connectWallet();
        signer = this.walletService.signer;
        if (!signer) {
          Swal.fire('Error', 'Conexión de wallet fallida o cancelada.', 'error');
          return;
        }
      } catch (e) {
        Swal.fire('Error', 'Error al conectar la wallet.', 'error');
        return;
      }
    }

    // Verifica la Red
    try {
      if (!signer.provider) throw new Error("Signer no tiene provider.");
      const network = await signer.provider.getNetwork();
      console.log("Red detectada:", network.name, network.chainId);
      if (network.chainId !== this.SEPOLIA_CHAIN_ID) { // Compara con BigInt
        Swal.fire('Red Incorrecta', `Por favor, cambia tu red en MetaMask a Sepolia Testnet (ChainID: ${this.SEPOLIA_CHAIN_ID}). Red actual: ${network.name} (${network.chainId})`, 'warning');
        return;
      }
      // Valida si la selección del formulario coincide (opcional, pero bueno)
      if (formData.blockchain.toLowerCase() !== 'sepolia') {
        console.warn(`La red seleccionada en el formulario (${formData.blockchain}) no coincide con la red conectada (Sepolia), pero se procederá.`);
        // Podrías detenerte aquí si quieres ser estricto:
        // Swal.fire('Conflicto de Red', 'La red seleccionada en el formulario no coincide con la red conectada en MetaMask.', 'warning');
        // return;
      }
    } catch (error: any) {
      Swal.fire('Error de Red', `No se pudo verificar la red conectada: ${error.message}`, 'error');
      return;
    }

    // 2. --- Despliegue del Contrato ---
    this.isDeploying = true;
    this.deploymentError = null;
    this.deployedContractAddress = null; // Limpia dirección previa
    this.isSaving = false; // Resetea estado de guardado
    console.log(`Iniciando despliegue de ${this.compilationResult.contractName} en Sepolia...`);

    Swal.fire({ // Feedback inmediato al usuario
      title: 'Desplegando Contrato',
      text: `Enviando transacción a la red Sepolia... Por favor, confirma en tu billetera.`,
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      // Crea la factoría del contrato
      const factory = new ethers.ContractFactory(
        this.compilationResult.abi,
        this.compilationResult.bytecode,
        signer // El signer es necesario para enviar la transacción de despliegue
      );

      // Envía la transacción de despliegue
      // NOTA: Aquí puedes pasar argumentos al constructor si tu contrato los necesita
      // const contract = await factory.deploy(arg1, arg2, ...);
      const contract = await factory.deploy();

      // Espera a que la transacción se mine y el contrato tenga dirección
      // ethers v6 recomienda esperar a tener la dirección directamente
      const deployedAddress = await contract.getAddress();
      console.log(`Contrato desplegado, dirección obtenida: ${deployedAddress}`);
      console.log(`Esperando confirmación final de despliegue (waitForDeployment)... Tx Hash: ${contract.deploymentTransaction()?.hash}`);

      // Espera a que el contrato esté completamente desplegado (opcional pero recomendado)
      // const deploymentReceipt = await contract.waitForDeployment(); // Puede tardar
      // console.log("Recibo de despliegue:", deploymentReceipt);

      // --- CORRECCIÓN: Actualizar UI dentro de ngZone ---
      this.ngZone.run(() => {
        this.deployedContractAddress = deployedAddress;
        this.isDeploying = false; // Termina estado despliegue
      });
      Swal.close(); // Cierra el Swal de "Desplegando..."

      console.log(`Contrato ${this.compilationResult.contractName} desplegado exitosamente en: ${this.deployedContractAddress}`);

      // 3. --- Firma y Guardado en Backend ---
      await this.signAndSaveReference(formData, deployedAddress, this.compilationResult.abi);

    } catch (error: any) {
      console.error("Error durante el proceso de despliegue:", error);
      let errorMessage = `Error durante el despliegue: ${error.reason || error.message || "Error desconocido"}`;
      // Códigos de error comunes de MetaMask/RPC
      if (error.code === 4001 || error.code === "ACTION_REJECTED") {
        errorMessage = "Transacción de despliegue rechazada en la billetera.";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Fondos insuficientes en la billetera para cubrir el costo de gas.";
      }
      this.ngZone.run(() => {
        this.deploymentError = errorMessage;
        this.isDeploying = false; // Asegura resetear el estado
      });
      Swal.close(); // Cierra el Swal si estaba abierto
      Swal.fire('Error de Despliegue', errorMessage, 'error');
    }
  }

  // --- Método para Firmar y Guardar ---
  async signAndSaveReference(formData: any, deployedAddress: string, contractAbi: any[]): Promise<void> {
    this.isSaving = true;
    const userAddress = this.walletService.getCurrentAddress(); // Obtiene la dirección actual
    let signer = this.walletService.signer;

    if (!userAddress || !signer) {
      Swal.fire('Error', 'No se pudo obtener la dirección o el firmante de la billetera.', 'error');
      this.ngZone.run(() => { this.isSaving = false; });
      return;
    }

    // Mensaje claro para firmar
    const messageToSign = `Confirmo que quiero guardar la referencia del contrato "${formData.contractName}" (${this.compilationResult?.contractName}) desplegado en ${deployedAddress} en la red ${formData.blockchain}.`;

    let signature;
    try {
      console.log("Solicitando firma del mensaje...");
      signature = await signer.signMessage(messageToSign);
      console.log("Firma obtenida:", signature);
    } catch (signError: any) {
      console.error("Error al firmar el mensaje:", signError);
      let signErrorMessage = 'La firma del mensaje fue cancelada o falló.';
      if (signError.code === 4001 || signError.code === "ACTION_REJECTED") {
        signErrorMessage = "Rechazaste la firma del mensaje en tu billetera.";
      }
      Swal.fire('Firma Requerida', signErrorMessage, 'warning');
      this.ngZone.run(() => { this.isSaving = false; });
      return;
    }

    // Prepara los datos para enviar al backend (incluyendo ABI)
    const contractDataForBackend: ContractReferenceDataForBackend = {
      contractAddress: deployedAddress,
      name: formData.contractName,
      description: formData.description || "",
      network: formData.blockchain.toLowerCase(), // Guarda en minúsculas
      contractNameSol: this.compilationResult?.contractName, // Nombre del contrato del .sol
      abi: contractAbi // <-- ¡AÑADIR EL ABI!
    };

    const payload: SaveRequestPayload = {
      contractData: contractDataForBackend,
      signedMessage: messageToSign,
      signature: signature,
      userAddress: userAddress,
    };

    this.saveSubscription?.unsubscribe(); // Cancela guardado anterior si lo hubiera

    console.log("Llamando a ContractBackendService para guardar...");
    this.saveSubscription = this.contractBackendService.saveVerifiedContractReference(payload)
      .subscribe({
        next: (response) => {
          this.ngZone.run(() => {
            console.log("Referencia guardada exitosamente vía backend, ID Firestore:", response.firestoreId);
            Swal.fire(
              '¡Éxito Total!',
              `Contrato desplegado en: ${this.deployedContractAddress}\nReferencia guardada correctamente.`,
              'success'
            );
            this.isSaving = false;
            // Podrías resetear el formulario aquí o navegar a "Mis Contratos"
          });
        },
        error: (error: Error) => {
          this.ngZone.run(() => {
            console.error("Error al guardar referencia vía backend:", error);
            // Muestra el error, pero el contrato YA está desplegado
            Swal.fire(
              'Despliegue Exitoso, pero...',
              `El contrato SÍ se desplegó en ${this.deployedContractAddress}, pero hubo un error al guardar la referencia en tu cuenta: ${error.message}. Puedes intentar guardarla manualmente.`,
              'warning' // Usamos warning porque el despliegue fue exitoso
            );
            this.isSaving = false;
          });
        }
      });
  }


  ngOnDestroy(): void {
    // Limpia suscripciones al destruir el componente
    this.compilationSubscription?.unsubscribe();
    this.saveSubscription?.unsubscribe();
  }
}