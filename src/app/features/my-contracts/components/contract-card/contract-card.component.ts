import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { ContractReferenceDataForBackend } from '../../../../core/services/contract-backend.service'

@Component({
  selector: 'app-contract-card',
  standalone: false,
  templateUrl: './contract-card.component.html',
  styleUrl: './contract-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContractCardComponent {


  // Recibe el objeto de contrato desde el componente padre (*ngFor en el grid)
  // Usamos '!' (definite assignment assertion) asumiendo que el padre SIEMPRE pasará un contrato.
  @Input() contract!: ContractReferenceDataForBackend;

  // Eventos que la tarjeta puede emitir hacia el padre
  @Output() viewDetails = new EventEmitter<ContractReferenceDataForBackend>();
  @Output() copyAddress = new EventEmitter<string>();
  @Output() shareContract = new EventEmitter<ContractReferenceDataForBackend>();

  // Propiedades para guardar datos leídos de la blockchain (para el siguiente paso)
  readData: { [key: string]: any } = {};
  isLoadingDetails = false;
  readError: string | null = null;

  constructor() { }

  // // --- Métodos para manejar acciones de la tarjeta ---

  // onViewDetailsClick(): void {
  //   // Emite el evento con los datos del contrato actual
  //   this.viewDetails.emit(this.contract);
  //   console.log('Ver detalles:', this.contract.id); // Para depuración
  // }
  // --- Action Handlers (emitirán eventos por ahora) ---
  onViewDetailsClick(): void {
    console.log('Clic en Ver Detalles para:', this.contract.contractAddress);
    this.viewDetails.emit(this.contract);
    // Aquí llamaremos a la función para leer datos on-chain en el siguiente paso
    // this.loadContractDetails();
  }


  onCopyAddressClick(event: MouseEvent): void {
    event.stopPropagation(); // Evita que el click se propague al botón "Ver Detalles" si están solapados
    if (!this.contract?.contractAddress) return; // Guarda por si no hay dirección

    navigator.clipboard.writeText(this.contract.contractAddress)
      .then(() => {
        console.log('Dirección copiada al portapapeles:', this.contract.contractAddress);
        // Podrías mostrar una notificación temporal de "Copiado!"
        this.copyAddress.emit(this.contract.contractAddress); // Emite la dirección copiada
      })
      .catch(err => {
        console.error('Error al copiar la dirección: ', err);
        // Mostrar un mensaje de error al usuario si falla
      });
  }

  // onShareClick(event: MouseEvent): void {
  //   event.stopPropagation();
  //   console.log('Compartir contrato:', this.contract.id);
  //   // Aquí iría la lógica para compartir (ej: Web Share API, copiar enlace, etc.)
  //   this.shareContract.emit(this.contract); // Emite el contrato a compartir
  // }

  // Función auxiliar para obtener la clase CSS según el estado
  getStatusClass(status: 'active' | 'pending' | 'finished'): string {
    return status; // El CSS ya usa 'active', 'pending', 'finished' como clases
  }
  // Helper para truncar direcciones largas
  truncateAddress(address?: string): string {
    if (!address) return '';
    if (address.length <= 10) return address; // No truncar si es muy corta
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    return `${start}...${end}`;
  }

  public get hasReadData(): boolean {
    // Devuelve true si readData existe y tiene al menos una clave
    return this.readData && Object.keys(this.readData).length > 0;
  }

}
