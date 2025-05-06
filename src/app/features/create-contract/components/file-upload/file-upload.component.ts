import { Component, ElementRef, EventEmitter, HostListener, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-file-upload',
  standalone: false,
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.css'
})
export class FileUploadComponent {
  // Referencia al input de archivo oculto en el HTML (#fileInput)
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  // Evento para notificar al componente padre sobre el archivo seleccionado
  @Output() fileSelected = new EventEmitter<File | undefined>();

  // Para mostrar el nombre del archivo y controlar el estilo drag-over
  selectedFileName: string | null = null;
  isActive = false; // Para la clase CSS .is-active

  // --- Manejadores de Eventos Drag and Drop ---

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault(); // Previene comportamiento por defecto (abrir archivo)
    event.stopPropagation(); // Evita que el evento se propague
    this.isActive = true; // Activa el estilo visual .is-active
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isActive = false; // Desactiva el estilo visual .is-active
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isActive = false; // Desactiva el estilo visual .is-active

    // Accede a los archivos arrastrados
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]); // Procesa el primer archivo soltado
    }
  }

  // --- Manejadores de Selección por Click ---

  // Se llama al hacer clic en el dropzone o el botón "Buscar"
  triggerFileInput(): void {
    // Simula un clic en el input de archivo oculto
    this.fileInputRef.nativeElement.click();
  }

  // Se llama cuando cambia el valor del input oculto (se selecciona un archivo)
  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList && fileList.length > 0) {
      this.processFile(fileList[0]); // Procesa el archivo seleccionado
    } else {
      this.resetState(); // Resetea si se cancela la selección
    }
  }

  // --- Lógica Común para Procesar el Archivo ---

  private processFile(file: File): void {
    // **Validación Básica (Ejemplo):** Verifica la extensión .sol
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'sol') {
      console.error('Error: Tipo de archivo no soportado. Selecciona un archivo .sol');
      alert('Error: Tipo de archivo no soportado. Selecciona un archivo .sol'); // Muestra alerta simple
      this.resetState();
      // Limpia el valor del input para permitir seleccionar el mismo archivo inválido de nuevo
      if (this.fileInputRef) {
        this.fileInputRef.nativeElement.value = '';
      }
      return; // Detiene el procesamiento
    }

    // Si el archivo es válido
    this.selectedFileName = file.name;
    console.log('Archivo seleccionado:', file);
    this.fileSelected.emit(file); // Emite el archivo al componente padre
  }

  private resetState(): void {
    this.selectedFileName = null;
    this.fileSelected.emit(undefined);
  }
}

