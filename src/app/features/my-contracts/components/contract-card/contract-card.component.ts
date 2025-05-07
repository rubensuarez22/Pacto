// src/app/shared/components/contract-card/contract-card.component.ts (o tu ruta)
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
// Asegúrate que esta interfaz tenga todos los campos necesarios
import { ContractReferenceDataForBackend } from '../../../../core/services/contract-backend.service'; // Ajusta la ruta
import Swal from 'sweetalert2'; // Importa SweetAlert2
import { DatePipe } from '@angular/common'; // Importa DatePipe

@Component({
  selector: 'app-contract-card',
  standalone: false,
  templateUrl: './contract-card.component.html',
  styleUrls: ['./contract-card.component.css'],
  providers: [DatePipe], // Añade DatePipe a los providers del componente
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContractCardComponent {
  @Input() contract!: ContractReferenceDataForBackend & { createdAt?: any, firestoreId?: string }; // Añade firestoreId si lo necesitas

  // Eventos que la tarjeta puede emitir
  @Output() viewDetails = new EventEmitter<ContractReferenceDataForBackend>(); // Lo mantenemos por si acaso
  @Output() copyAddress = new EventEmitter<string>();
  // @Output() shareContract = new EventEmitter<ContractReferenceDataForBackend>();

  // Propiedades para datos on-chain (se mantienen para futura implementación)
  readData: { [key: string]: any } = {};
  isLoadingDetails = false;
  readError: string | null = null;

  // Ya no necesitamos showFullDetails
  // showFullDetails: boolean = false;

  constructor(private datePipe: DatePipe) { } // Inyecta DatePipe

  // --- Action Handlers ---

  onViewDetailsClick(): void {
    console.log('Ver Detalles (Pop-up) para:', this.contract.contractAddress);
    this.viewDetails.emit(this.contract); // Emitir por si el padre escucha

    // Formatear fecha (si existe y es un objeto Timestamp de Firestore o Date)
    let formattedDate = 'N/A';
    if (this.contract.createdAt) {
      const dateToFormat = this.contract.createdAt?.toDate ? this.contract.createdAt.toDate() : this.contract.createdAt;
      formattedDate = this.datePipe.transform(dateToFormat, 'medium') || 'Fecha inválida';
    }

    // Construir el HTML para SweetAlert2
    // Usamos estilos inline inspirados en tu CSS para mantener la apariencia
    const detailsHtml = `
      <div style="text-align: left; font-family: 'Oxanium', sans-serif; color: #cccccc;">
        
        <div style="margin-bottom: 10px;">
          <strong style="color: #ffffff;">Nombre (App):</strong> 
          <span style="color: #e0e0e0;">${this.contract.name || 'N/A'}</span>
        </div>
        
        ${this.contract.contractNameSol ? `
        <div style="margin-bottom: 10px;">
          <strong style="color: #ffffff;">Nombre Contrato (.sol):</strong> 
          <span style="color: #e0e0e0;">${this.contract.contractNameSol}</span>
        </div>` : ''}
        
        <div style="margin-bottom: 10px;">
          <strong style="color: #ffffff;">Dirección Completa:</strong>
          <code style="display: block; background-color: rgba(0,0,0,0.2); padding: 5px; border-radius: 4px; font-family: monospace; color: #a0a0a0; word-break: break-all; margin-top: 3px;">
            ${this.contract.contractAddress}
          </code>
        </div>

        ${this.contract.network ? `
        <div style="margin-bottom: 10px;">
          <strong style="color: #ffffff;">Red:</strong> 
          <span style="color: #e0e0e0;">${this.contract.network}</span>
        </div>` : ''}

        ${this.contract.description ? `
        <div style="margin-bottom: 10px;">
          <strong style="color: #ffffff;">Descripción:</strong>
          <p style="color: #e0e0e0; margin: 3px 0 0 0; font-size: 0.9em; white-space: pre-wrap;">${this.contract.description}</p>
        </div>` : ''}
        
        <div style="margin-bottom: 10px;">
          <strong style="color: #ffffff;">Fecha Creación (DB):</strong> 
          <span style="color: #e0e0e0;">${formattedDate}</span>
        </div>
        
        <div style="margin-bottom: 10px;">
          <strong style="color: #ffffff;">ABI Disponible:</strong> 
          <span style="color: #e0e0e0;">${this.contract.abi && this.contract.abi.length > 0 ? 'Sí' : 'No'}</span>
          ${this.contract.abi && this.contract.abi.length > 0 ? `
            <button id="copyAbiBtn" style="margin-left: 10px; padding: 3px 8px; font-size: 0.8em; cursor: pointer; background-color: #5a3a7e; color: white; border: none; border-radius: 4px;">Copiar ABI</button>
          ` : ''}
        </div>

        </div>
    `;

    // Mostrar el pop-up de SweetAlert2
    Swal.fire({
      title: `<strong style="font-family: 'Oxanium', sans-serif; color: #ffffff;">Detalles del Contrato</strong>`,
      html: detailsHtml,
      background: 'rgba(42, 26, 64, 0.95)', // Fondo similar a la tarjeta
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#AD1AAF', // Color del botón principal
      showCancelButton: false,
      width: '600px', // Ajusta el ancho si es necesario
      didOpen: (popup) => {
        // Añadir listener al botón de copiar ABI si existe
        const copyBtn = popup.querySelector('#copyAbiBtn');
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            if (this.contract.abi) {
              navigator.clipboard.writeText(JSON.stringify(this.contract.abi, null, 2))
                .then(() => {
                   // Cambiar texto del botón temporalmente
                   copyBtn.textContent = '¡Copiado!';
                   setTimeout(() => { copyBtn.textContent = 'Copiar ABI'; }, 1500);
                 })
                .catch(err => console.error('Error al copiar ABI:', err));
            }
          });
        }
      }
    });

    // Lógica futura para cargar datos on-chain podría ir aquí
    // this.loadContractDetails();
  }

  onCopyAddressClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.contract?.contractAddress) return;

    navigator.clipboard.writeText(this.contract.contractAddress)
      .then(() => {
        console.log('Dirección copiada:', this.contract.contractAddress);
        this.copyAddress.emit(this.contract.contractAddress);
        // Notificación más discreta para copiar dirección
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Dirección copiada',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true,
            background: '#333', // Fondo oscuro para toast
            color: '#fff'       // Texto blanco para toast
        });
      })
      .catch(err => {
        console.error('Error al copiar la dirección: ', err);
        Swal.fire('Error', 'No se pudo copiar la dirección.', 'error');
      });
  }

  // --- Helpers ---
  truncateAddress(address?: string): string {
    if (!address) return '';
    if (address.length <= 10) return address;
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    return `${start}...${end}`;
  }

  public get hasReadData(): boolean {
    return this.readData && Object.keys(this.readData).length > 0;
  }
  objectKeys = Object.keys;
  formatKey(key: string): string {
    const result = key.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
}
