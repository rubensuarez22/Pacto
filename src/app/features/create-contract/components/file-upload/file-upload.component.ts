// Al principio de file-upload.component.ts
import { Component, ElementRef, EventEmitter, HostListener, Output, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { WalletService } from '../../../../core/services/wallet.service'; // <-- Asegúrate que la ruta sea correcta
import { Subscription } from 'rxjs'; // <-- Importa Subscription
import Swal from 'sweetalert2'; // <-- Importa SweetAlert2

@Component({
  selector: 'app-file-upload',
  standalone: false,
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css'] // Corregido a styleUrls
})
export class FileUploadComponent implements OnInit, OnDestroy { // Implementa OnInit y OnDestroy
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @Output() fileSelected = new EventEmitter<File | undefined>();

  selectedFileName: string | null = null;
  isActive = false;

  // Propiedad local para guardar el estado de conexión
  isWalletConnected: boolean = false;
  private walletStatusSubscription: Subscription | undefined;

  // Inyecta WalletService
  constructor(private walletService: WalletService) {}

  ngOnInit(): void {
    // Suscríbete al estado de conexión del WalletService
    this.walletStatusSubscription = this.walletService.isConnected$.subscribe(
      (connected) => {
        this.isWalletConnected = connected;
        console.log('FileUploadComponent: Wallet connected status:', this.isWalletConnected);
      }
    );
  }

  ngOnDestroy(): void {
    // Desuscribirse para evitar fugas de memoria
    if (this.walletStatusSubscription) {
      this.walletStatusSubscription.unsubscribe();
    }
  }

  // --- Manejadores de Eventos Drag and Drop ---

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isWalletConnected) {
      // Solo activa el estilo visual si la wallet está conectada
      this.isActive = true;
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'; // Indica que se puede soltar
      }
    } else {
      // Si no está conectada, no actives el estilo y indica que no se puede soltar
      this.isActive = false;
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'none'; // Indica que no se permite soltar
      }
    }
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isActive = false; // Siempre desactiva al salir
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isActive = false;

    // VERIFICAR CONEXIÓN ANTES DE PROCESAR
    if (!this.isWalletConnected) {
      this.showConnectWalletAlert();
      return; // No procesar el archivo
    }

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  // --- Manejadores de Selección por Click ---

  triggerFileInput(): void {
    // VERIFICAR CONEXIÓN ANTES DE ABRIR EL DIÁLOGO (Opcional, pero consistente)
    if (!this.isWalletConnected) {
      this.showConnectWalletAlert();
      return; // No abrir el diálogo de archivo
    }
    this.fileInputRef.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    // VERIFICAR CONEXIÓN ANTES DE PROCESAR
    if (!this.isWalletConnected) {
      this.showConnectWalletAlert();
      // Limpiar el input por si el usuario cancela el diálogo después del alert
      if (this.fileInputRef) {
        this.fileInputRef.nativeElement.value = '';
      }
      return; // No procesar el archivo
    }

    const element = event.target as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList && fileList.length > 0) {
      this.processFile(fileList[0]);
    } else {
      this.resetState();
    }
     // Limpiar el valor del input para permitir seleccionar el mismo archivo de nuevo si falla la validación interna
     if (this.fileInputRef) {
        this.fileInputRef.nativeElement.value = '';
     }
  }

  // --- Lógica Común para Procesar el Archivo ---

  private processFile(file: File): void {
    // La verificación de conexión ya se hizo antes de llamar a este método.
    // Solo validamos la extensión aquí.
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'sol') {
      console.error('Error: Tipo de archivo no soportado. Selecciona un archivo .sol');
      Swal.fire({ // Usamos Swal también para este error
        icon: 'error',
        title: 'Archivo Inválido',
        text: 'Tipo de archivo no soportado. Por favor, selecciona un archivo .sol',
      });
      this.resetState();
      return;
    }

    this.selectedFileName = file.name;
    console.log('Archivo seleccionado:', file);
    this.fileSelected.emit(file);
  }

  private resetState(): void {
    this.selectedFileName = null;
    this.fileSelected.emit(undefined);
  }

  // --- Función para mostrar la alerta ---
  private showConnectWalletAlert(): void {
    Swal.fire({
      icon: 'warning',
      title: 'Wallet No Conectada',
      text: 'Por favor, conecta tu wallet MetaMask para subir un contrato.',
      confirmButtonText: 'Entendido'
      // Podrías añadir un botón para conectar:
      // showCancelButton: true,
      // confirmButtonText: 'Conectar Wallet',
      // }).then((result) => {
      //   if (result.isConfirmed) {
      //     this.walletService.connectWallet(); // Llama a conectar desde el servicio
      //   }
    });
  }
}