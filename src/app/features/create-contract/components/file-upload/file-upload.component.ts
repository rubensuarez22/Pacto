// src/app/shared/components/file-upload/file-upload.component.ts (o tu ruta)
import { Component, ElementRef, EventEmitter, HostListener, Output, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { WalletService } from '../../../../core/services/wallet.service'; // Ajusta la ruta
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2'; // Importa SweetAlert2

@Component({
  selector: 'app-file-upload',
  standalone: false,
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @Output() fileSelected = new EventEmitter<File | undefined>();

  selectedFileName: string | null = null;
  isActive = false;
  isWalletConnected: boolean = false;
  private walletStatusSubscription: Subscription | undefined;

  constructor(private walletService: WalletService) {}

  ngOnInit(): void {
    this.walletStatusSubscription = this.walletService.isConnected$.subscribe(
      (connected) => {
        this.isWalletConnected = connected;
        console.log('FileUploadComponent: Wallet connected status:', this.isWalletConnected);
      }
    );
  }

  ngOnDestroy(): void {
    if (this.walletStatusSubscription) {
      this.walletStatusSubscription.unsubscribe();
    }
  }

  // --- Manejadores Drag and Drop ---
  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isWalletConnected) {
      this.isActive = true;
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    } else {
      this.isActive = false;
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'none';
      }
    }
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isActive = false;
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isActive = false;
    if (!this.isWalletConnected) {
      this.showConnectWalletAlert(); // Llama a la alerta estilizada
      return;
    }
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  // --- Manejadores Click ---
  triggerFileInput(): void {
    if (!this.isWalletConnected) {
      this.showConnectWalletAlert(); // Llama a la alerta estilizada
      return;
    }
    this.fileInputRef.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    if (!this.isWalletConnected) {
      this.showConnectWalletAlert(); // Llama a la alerta estilizada
      if (this.fileInputRef) {
        this.fileInputRef.nativeElement.value = '';
      }
      return;
    }
    const element = event.target as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      this.processFile(fileList[0]);
    } else {
      this.resetState();
    }
    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  // --- Procesar Archivo ---
  private processFile(file: File): void {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'sol') {
      Swal.fire({ // Alerta de error también estilizada
        icon: 'error',
        title: '<strong style="font-family: \'Oxanium\', sans-serif; color: #ffffff;">Archivo Inválido</strong>',
        html: '<p style="font-family: \'Oxanium\', sans-serif; color: #cccccc;">Tipo de archivo no soportado. Por favor, selecciona un archivo .sol</p>',
        background: 'rgba(42, 26, 64, 0.95)',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#AD1AAF',
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

  // --- Función para mostrar la alerta estilizada ---
  private showConnectWalletAlert(): void {
    Swal.fire({
      icon: 'warning', // Icono de advertencia
      title: '<strong style="font-family: \'Oxanium\', sans-serif; color: #ffffff;">Wallet No Conectada</strong>', // Título con estilo
      html: '<p style="font-family: \'Oxanium\', sans-serif; color: #cccccc;">Por favor, conecta tu wallet MetaMask para subir un contrato.</p>', // Texto con estilo
      background: 'rgba(42, 26, 64, 0.95)', // Fondo oscuro similar a las tarjetas/pop-up de detalles
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#AD1AAF', // Color del botón similar al de "Ver Detalles"
      // Opcional: Añadir botón para conectar
      // showCancelButton: true,
      // cancelButtonText: 'Cancelar',
      // confirmButtonText: 'Conectar Wallet',
      // preConfirm: () => {
      //   // No podemos llamar directamente a this.walletService aquí
      //   // porque el contexto de 'this' cambia dentro de preConfirm.
      //   // Necesitaríamos una forma de pasar la instancia o usar un observable/subject
      //   // para comunicar la intención de conectar al servicio.
      //   // Por simplicidad, lo dejamos solo con "Entendido".
      //   // Si se quisiera conectar, sería mejor que el usuario use el botón del header.
      // }
    });
  }
}
