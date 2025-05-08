// src/app/features/create-contract/create-contract.component.ts
import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { WalletService } from '../../../../core/services/wallet.service';
import { CompilerService, CompilationResult } from '../../../../core/services/compiler.service';
import { ContractBackendService, ContractReferenceDataForBackend, SaveRequestPayload} from '../../../../core/services/contract-backend.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { ethers } from 'ethers';

// --- Opciones y Estilos para SweetAlert2 ---
// Definimos las opciones base fuera de la clase para reutilizarlas
const swalOptionsBase = {
  background: 'rgba(42, 26, 64, 0.95)', // Fondo oscuro similar a las tarjetas
  confirmButtonColor: '#AD1AAF',      // Color botón principal (morado)
  color: '#cccccc',                   // Color de texto por defecto (gris claro)
  confirmButtonText: 'Entendido',     // Texto por defecto para el botón OK
  customClass: { // Clases CSS si necesitas más control (opcional)
    // title: 'swal-title-custom',
    // htmlContainer: 'swal-html-custom',
  }
};
// Estilos inline para títulos y contenido HTML
const titleStyle = 'font-family: \'Oxanium\', sans-serif; color: #ffffff; font-weight: 600;'; // Título blanco y semi-negrita
const htmlStyle = 'font-family: \'Oxanium\', sans-serif; color: #cccccc;'; // Texto gris claro
const preStyle = 'text-align: left; font-size: 0.8em; color: #cccccc; background-color: rgba(0,0,0,0.1); padding: 8px; border-radius: 4px; margin-top: 8px; white-space: pre-wrap; word-break: break-all;'; // Estilo para <pre>
// --- Fin Opciones y Estilos ---


@Component({
  selector: 'app-create-contract',
  standalone: false,
  templateUrl: './create-contract.component.html',
  styleUrls: ['./create-contract.component.css']
})
export class CreateContractComponent implements OnInit, OnDestroy {
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
  private walletStatusSubscription: Subscription | undefined;

  private readonly SEPOLIA_CHAIN_ID = 11155111n;

  constructor(
    private compilerService: CompilerService,
    private walletService: WalletService,
    private contractBackendService: ContractBackendService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.walletStatusSubscription = this.walletService.isConnected$.subscribe(isConnected => {
      console.log('CreateContractComponent: Wallet connection status changed:', isConnected);
      if (!isConnected) {
        this.resetOnFileChangeOrDisconnect();
      }
    });
  }

  private resetOnFileChangeOrDisconnect(): void {
    console.log("CreateContractComponent: Reseteando estado...");
    this.selectedFile = undefined;
    this.soliditySourceCode = undefined;
    this.fileName = undefined;
    this.compilationResult = null;
    this.compilationError = null;
    this.deployedContractAddress = null;
    this.deploymentError = null;
    this.isCompiling = false;
    this.isDeploying = false;
    this.isSaving = false;
    this.compilationSubscription?.unsubscribe();
    this.saveSubscription?.unsubscribe();
  }

  onFileSelectedFromUpload(file: File | undefined): void {
    this.resetOnFileChangeOrDisconnect();
    this.selectedFile = file;

    if (file) {
      this.fileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.ngZone.run(() => {
          this.soliditySourceCode = e.target?.result as string;
          console.log(`Contenido del archivo ${this.fileName} cargado.`);
          if (this.soliditySourceCode && this.fileName) {
            this.handleCompileContract();
          } else {
            Swal.fire({
              ...swalOptionsBase, // Aplica estilos
              icon: 'error',
              title: `<strong style="${titleStyle}">Error Interno</strong>`,
              html: `<p style="${htmlStyle}">No se pudo obtener el contenido del archivo.</p>`,
            });
          }
        });
      };
      reader.onerror = (e) => {
        this.ngZone.run(() => {
          console.error('Error al leer el archivo:', e);
          Swal.fire({
             ...swalOptionsBase, // Aplica estilos
            icon: 'error',
            title: `<strong style="${titleStyle}">Error de Archivo</strong>`,
            html: `<p style="${htmlStyle}">No se pudo leer el archivo seleccionado.</p>`,
          });
          this.selectedFile = undefined;
        });
      };
      reader.readAsText(file);
    }
  }

  handleCompileContract(): void {
    if (!this.soliditySourceCode || !this.fileName) {
      Swal.fire({
        ...swalOptionsBase, // Aplica estilos
        icon: 'warning',
        title: `<strong style="${titleStyle}">Archivo no Preparado</strong>`,
        html: `<p style="${htmlStyle}">El contenido del archivo no está listo para compilar.</p>`,
      });
      return;
    }
    console.log(`CreateContract: Iniciando compilación para ${this.fileName}...`);
    this.isCompiling = true;
    // ... resetear estados ...
    this.compilationResult = null;
    this.compilationError = null;
    this.deployedContractAddress = null;
    this.deploymentError = null;
    this.isDeploying = false;
    this.isSaving = false;

    this.compilationSubscription?.unsubscribe();

    this.compilationSubscription = this.compilerService.compile(this.fileName, this.soliditySourceCode)
      .subscribe({
        next: (result) => {
          this.ngZone.run(() => {
            this.compilationResult = result;
            console.log('Resultado de compilación recibido:', this.compilationResult);
            this.isCompiling = false;

            let messageHtml = `<p style="${htmlStyle}">Contrato: <strong>${result.contractName}</strong></p>`;
            messageHtml += `<p style="${htmlStyle}">El ABI y Bytecode están listos. Completa el formulario para desplegar.</p>`;
            if (result.warnings && result.warnings.length > 0) {
              // Usamos preStyle para las advertencias
              messageHtml += `<strong style="${htmlStyle}">Advertencias:</strong><pre style="${preStyle}">${result.warnings.join("\n")}</pre>`;
            }
            Swal.fire({
              ...swalOptionsBase, // Aplica estilos
              icon: 'success',
              title: `<strong style="${titleStyle}">¡Compilación Exitosa!</strong>`,
              html: messageHtml,
              // confirmButtonText ya está en swalOptionsBase
            });
          });
        },
        error: (error: Error) => {
          this.ngZone.run(() => {
            console.error('Error de compilación en componente:', error);
            this.compilationError = error.message;
            this.isCompiling = false;
            Swal.fire({
              ...swalOptionsBase, // Aplica estilos
              icon: 'error',
              title: `<strong style="${titleStyle}">Error de Compilación</strong>`,
              html: `<p style="${htmlStyle}">${this.compilationError}</p>`, // Muestra el mensaje de error
            });
          });
        }
      });
  }

  async onSubmitFromAppForm(formData: any): Promise<void> {
    console.log("onSubmitFromAppForm llamado con:", formData);

    if (!this.compilationResult?.abi || !this.compilationResult?.bytecode) {
      Swal.fire({ ...swalOptionsBase, icon: 'warning', title: `<strong style="${titleStyle}">Error</strong>`, html: `<p style="${htmlStyle}">Compila el contrato primero.</p>` });
      return;
    }

    let signer = this.walletService.signer;
    if (!signer) {
      try {
        await this.walletService.connectWallet();
        signer = this.walletService.signer;
        if (!signer) {
          Swal.fire({ ...swalOptionsBase, icon: 'error', title: `<strong style="${titleStyle}">Error</strong>`, html: `<p style="${htmlStyle}">Conexión de wallet fallida o cancelada.</p>` });
          return;
        }
      } catch (e) {
        Swal.fire({ ...swalOptionsBase, icon: 'error', title: `<strong style="${titleStyle}">Error</strong>`, html: `<p style="${htmlStyle}">Error al conectar la wallet.</p>` });
        return;
      }
    }

    try {
      if (!signer.provider) throw new Error("Signer no tiene provider.");
      const network = await signer.provider.getNetwork();
      if (network.chainId !== this.SEPOLIA_CHAIN_ID) {
        Swal.fire({ ...swalOptionsBase, icon: 'warning', title: `<strong style="${titleStyle}">Red Incorrecta</strong>`, html: `<p style="${htmlStyle}">Cambia tu red en MetaMask a Sepolia Testnet.</p>` });
        return;
      }
      if (formData.blockchain.toLowerCase() !== 'sepolia') {
         console.warn(`Red seleccionada (${formData.blockchain}) no es Sepolia, pero se procederá.`);
      }
    } catch (error: any) {
      Swal.fire({ ...swalOptionsBase, icon: 'error', title: `<strong style="${titleStyle}">Error de Red</strong>`, html: `<p style="${htmlStyle}">No se pudo verificar la red: ${error.message}</p>` });
      return;
    }

    this.isDeploying = true;
    this.deploymentError = null;
    this.deployedContractAddress = null;
    this.isSaving = false;
    console.log(`Iniciando despliegue de ${this.compilationResult.contractName}...`);

    Swal.fire({
      ...swalOptionsBase, // Aplica estilos
      title: `<strong style="${titleStyle}">Desplegando Contrato</strong>`,
      html: `<p style="${htmlStyle}">Enviando transacción... Por favor, espera y aprueba en tu billetera.</p>`,
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(Swal.getConfirmButton()); }
    });

    try {
      const factory = new ethers.ContractFactory(this.compilationResult.abi, this.compilationResult.bytecode, signer);
      const contract = await factory.deploy();
      const deployTxHash = contract.deploymentTransaction()?.hash;
      
      Swal.update({ html: `<p style="${htmlStyle}">Transacción enviada (Hash: ${deployTxHash}). Esperando confirmación...</p>` });

      const deployedAddress = await contract.getAddress();
      console.log(`Contrato desplegado, dirección obtenida: ${deployedAddress}`);
      
      this.ngZone.run(() => { this.deployedContractAddress = deployedAddress; });
      Swal.close(); 

      await this.signAndSaveReference(formData, deployedAddress, this.compilationResult.abi);

    } catch (error: any) {
      console.error("Error durante el proceso de despliegue:", error);
      let errorMessage = `Error durante el despliegue: ${error.reason || error.message || "Error desconocido"}`;
      if (error.code === 4001 || error.code === "ACTION_REJECTED") {
        errorMessage = "Transacción de despliegue rechazada en la billetera.";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Fondos insuficientes en la billetera para cubrir el costo de gas.";
      }
      this.ngZone.run(() => {
        this.deploymentError = errorMessage;
        this.isDeploying = false;
        this.isSaving = false;
      });
      Swal.close();
      Swal.fire({ ...swalOptionsBase, icon: 'error', title: `<strong style="${titleStyle}">Error de Despliegue</strong>`, html: `<p style="${htmlStyle}">${errorMessage}</p>` });
    }
  }

  async signAndSaveReference(formData: any, deployedAddress: string, contractAbi: any[]): Promise<void> {
    this.isSaving = true;
    const userAddress = this.walletService.getCurrentAddress();
    let signer = this.walletService.signer;

    if (!userAddress || !signer) {
      Swal.fire({ ...swalOptionsBase, icon: 'error', title: `<strong style="${titleStyle}">Error</strong>`, html: `<p style="${htmlStyle}">No se pudo obtener la dirección o el firmante.</p>` });
      this.ngZone.run(() => { this.isSaving = false; this.isDeploying = false; });
      return;
    }

    const messageToSign = `Confirmo guardar referencia del contrato ${formData.contractName} (${this.compilationResult?.contractName}) desplegado en ${deployedAddress} en ${formData.blockchain}.`;
    let signature;
    try {
      signature = await signer.signMessage(messageToSign);
    } catch (signError: any) {
      let signErrorMessage = 'La firma del mensaje fue cancelada o falló.';
      if (signError.code === 4001 || signError.code === "ACTION_REJECTED") {
        signErrorMessage = "Rechazaste la firma del mensaje.";
      }
      Swal.fire({ ...swalOptionsBase, icon: 'warning', title: `<strong style="${titleStyle}">Firma Requerida</strong>`, html: `<p style="${htmlStyle}">${signErrorMessage} No se pudo guardar la referencia.</p>` });
      this.ngZone.run(() => { this.isSaving = false; this.isDeploying = false; });
      return;
    }

    const contractDataForBackend: ContractReferenceDataForBackend = {
      contractAddress: deployedAddress,
      name: formData.contractName,
      description: formData.description || "",
      network: formData.blockchain.toLowerCase(),
      contractNameSol: this.compilationResult?.contractName,
      abi: contractAbi,
    };
    const payload: SaveRequestPayload = { contractData: contractDataForBackend, signedMessage: messageToSign, signature: signature, userAddress: userAddress };

    this.saveSubscription?.unsubscribe();
    console.log("Llamando a ContractBackendService para guardar...");

    this.saveSubscription = this.contractBackendService.saveVerifiedContractReference(payload)
      .subscribe({
        next: (response) => {
          this.ngZone.run(() => {
            console.log("Referencia guardada vía backend, ID Firestore:", response.firestoreId);
            Swal.fire({
              ...swalOptionsBase, // Aplica estilos
              icon: 'success',
              title: `<strong style="${titleStyle}">¡Éxito Total!</strong>`,
              html: `<p style="${htmlStyle}">Contrato desplegado en: ${this.deployedContractAddress}<br>Referencia guardada correctamente.</p>`,
            });
            this.isSaving = false;
            this.isDeploying = false;
          });
        },
        error: (error: Error) => {
          this.ngZone.run(() => {
            console.error("Error al guardar referencia vía backend:", error);
            Swal.fire({
              ...swalOptionsBase, // Aplica estilos
              icon: 'warning',
              title: `<strong style="${titleStyle}">Despliegue Exitoso, pero...</strong>`,
              html: `<p style="${htmlStyle}">El contrato se desplegó en ${this.deployedContractAddress}, pero hubo un error al guardar la referencia: ${error.message}</p>`,
            });
            this.isSaving = false;
            this.isDeploying = false;
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.compilationSubscription?.unsubscribe();
    this.saveSubscription?.unsubscribe();
    this.walletStatusSubscription?.unsubscribe();
  }
}
