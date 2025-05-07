// src/app/features/create-contract/create-contract.component.ts
import { Component, OnDestroy, NgZone } from '@angular/core';
import { WalletService } from '../../../../core/services/wallet.service';
import { CompilerService, CompilationResult } from '../../../../core/services/compiler.service';
import { ContractBackendService, ContractReferenceDataForBackend, SaveRequestPayload, SaveContractResponse } from '../../../../core/services/contract-backend.service';
import { Subscription, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { ethers } from 'ethers';

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
  isSaving: boolean = false;

  private compilationSubscription: Subscription | undefined;
  private saveSubscription: Subscription | undefined;

  private readonly SEPOLIA_CHAIN_ID = 11155111n;

  constructor(
    private compilerService: CompilerService,
    private walletService: WalletService,
    private contractBackendService: ContractBackendService,
    private ngZone: NgZone
  ) {}

  // ... (onFileSelectedFromUpload y handleCompileContract sin cambios) ...
  onFileSelectedFromUpload(file: File | undefined): void {
    this.selectedFile = file;
    this.soliditySourceCode = undefined;
    this.fileName = undefined;
    this.compilationResult = null;
    this.compilationError = null;
    this.deployedContractAddress = null;
    this.deploymentError = null;
    this.isDeploying = false;
    this.isSaving = false;

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
    this.deployedContractAddress = null;
    this.deploymentError = null;
    this.isDeploying = false;
    this.isSaving = false;

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


  async onSubmitFromAppForm(formData: any): Promise<void> {
    console.log("onSubmitFromAppForm llamado con:", formData);

    // --- Verificaciones iniciales ---
    if (!this.compilationResult || !this.compilationResult.abi || !this.compilationResult.bytecode) {
      Swal.fire('Error', 'Datos de compilación no encontrados.', 'error');
      return;
    }

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

    try {
      if (!signer.provider) throw new Error("Signer no tiene provider.");
      const network = await signer.provider.getNetwork();
      if (network.chainId !== this.SEPOLIA_CHAIN_ID) {
        Swal.fire('Red Incorrecta', 'Cambia tu red en MetaMask a Sepolia Testnet.', 'warning');
        return;
      }
      if (formData.blockchain !== 'sepolia') {
         console.warn("Selección del formulario no es Sepolia, pero se procederá.");
      }
    } catch (error: any) {
      Swal.fire('Error', `No se pudo verificar la red conectada: ${error.message}`, 'error');
      return;
    }

    // --- Inicio Despliegue ---
    this.isDeploying = true;
    this.deployedContractAddress = null;
    this.deploymentError = null;
    this.isSaving = false;
    console.log("Iniciando despliegue en Sepolia...");

    try {
      const factory = new ethers.ContractFactory(
        this.compilationResult.abi,
        this.compilationResult.bytecode,
        signer,
      );
      const contract = await factory.deploy();

      Swal.fire({
        title: 'Desplegando Contrato',
        text: `Enviando transacción... Hash: ${contract.deploymentTransaction()?.hash}. Espera la confirmación...`,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      const deploymentReceipt = await contract.waitForDeployment();
      const deployedAddress = await deploymentReceipt.getAddress(); // Guarda en variable local primero

      // --- CORRECCIÓN: Verificar que deployedAddress no sea null/undefined ---
      if (!deployedAddress) {
          throw new Error("La dirección del contrato desplegado no se pudo obtener.");
      }

      this.ngZone.run(() => {
        this.deployedContractAddress = deployedAddress; // Asigna solo si es válida
      });
      Swal.close();

      console.log(`Contrato desplegado exitosamente en: ${this.deployedContractAddress}`);

      // --- Inicio Guardado Verificado ---
      this.isSaving = true;
      const userAddress = await signer.getAddress();
      // Asegúrate de que deployedContractAddress (ahora es 'deployedAddress') no sea null aquí
      const messageToSign = `Confirmo que quiero guardar la referencia del contrato ${this.compilationResult.contractName} desplegado en ${deployedAddress} en la red ${formData.blockchain}.`;

      let signature;
      try {
        signature = await signer.signMessage(messageToSign);
      } catch (signError: any) {
        console.error("Error al firmar el mensaje:", signError);
        Swal.fire('Firma Requerida', 'La firma del mensaje fue cancelada o falló.', 'warning');
        this.ngZone.run(() => { this.isDeploying = false; this.isSaving = false; });
        return;
      }

      // --- CORRECCIÓN: Usar la variable local 'deployedAddress' verificada ---
      const contractDataForBackend: Omit<ContractReferenceDataForBackend, 'userAddress'> = {
        contractAddress: deployedAddress, // <-- Usa la variable verificada
        name: formData.contractName,
        description: formData.description || "",
        network: 'sepolia',
        contractNameSol: this.compilationResult.contractName,
      };

      const payload: SaveRequestPayload = {
        contractData: contractDataForBackend,
        signedMessage: messageToSign,
        signature: signature,
        userAddress: userAddress,
      };

      if (this.saveSubscription) {
        this.saveSubscription.unsubscribe();
      }

      console.log("Llamando a ContractBackendService para guardar...");
      this.saveSubscription = this.contractBackendService.saveVerifiedContractReference(payload)
        .subscribe({
          next: (response) => {
            console.log("Referencia guardada exitosamente vía backend, ID Firestore:", response.firestoreId);
            Swal.fire(
              '¡Despliegue y Guardado Exitosos!',
              `Contrato desplegado en: ${this.deployedContractAddress}\nReferencia guardada (ID: ${response.firestoreId}).`,
              'success'
            );
            this.ngZone.run(() => { this.isDeploying = false; this.isSaving = false; });
          },
          error: (error: Error) => {
            console.error("Error al guardar referencia vía backend:", error);
            Swal.fire(
              'Despliegue Exitoso, pero...',
              `El contrato se desplegó en ${this.deployedContractAddress}, pero hubo un error al guardar la referencia: ${error.message}`,
              'warning'
            );
            this.ngZone.run(() => { this.isDeploying = false; this.isSaving = false; });
          }
        });
      // --- FIN Guardado Verificado ---

    } catch (error: any) {
      console.error("Error durante el despliegue:", error);
      let errorMessage = `Error durante el despliegue: ${error.message || "Error desconocido"}`;
      if (error.code === 4001 || error.code === "ACTION_REJECTED") {
        errorMessage = "Transacción de despliegue rechazada.";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Fondos insuficientes para el gas.";
      }
      this.ngZone.run(() => {
        this.deploymentError = errorMessage;
        this.isDeploying = false;
        this.isSaving = false;
      });
      Swal.close();
      Swal.fire('Error de Despliegue', errorMessage, 'error');
    }
  }

  ngOnDestroy(): void {
    if (this.compilationSubscription) {
      this.compilationSubscription.unsubscribe();
    }
    if (this.saveSubscription) {
      this.saveSubscription.unsubscribe();
    }
  }
}
