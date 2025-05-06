import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
export interface ContractData {
  id: number | string;
  title: string;
  status: 'active' | 'pending' | 'finished'; // Estados definidos
  date: string; // O usar tipo Date
  address: string;
  // Añade cualquier otra propiedad que necesites mostrar
}
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
  @Input() contract!: ContractData;

  // Eventos que la tarjeta puede emitir hacia el padre
  @Output() viewDetails = new EventEmitter<ContractData>();
  @Output() copyAddress = new EventEmitter<string>();
  @Output() shareContract = new EventEmitter<ContractData>();

  constructor() { }

  // --- Métodos para manejar acciones de la tarjeta ---

  onViewDetailsClick(): void {
    // Emite el evento con los datos del contrato actual
    this.viewDetails.emit(this.contract);
    console.log('Ver detalles:', this.contract.id); // Para depuración
  }

  onCopyAddressClick(event: MouseEvent): void {
    event.stopPropagation(); // Evita que el click se propague al botón "Ver Detalles" si están solapados
    if (!this.contract?.address) return; // Guarda por si no hay dirección

    navigator.clipboard.writeText(this.contract.address)
      .then(() => {
        console.log('Dirección copiada al portapapeles:', this.contract.address);
        // Podrías mostrar una notificación temporal de "Copiado!"
        this.copyAddress.emit(this.contract.address); // Emite la dirección copiada
      })
      .catch(err => {
        console.error('Error al copiar la dirección: ', err);
        // Mostrar un mensaje de error al usuario si falla
      });
  }

  onShareClick(event: MouseEvent): void {
    event.stopPropagation();
    console.log('Compartir contrato:', this.contract.id);
    // Aquí iría la lógica para compartir (ej: Web Share API, copiar enlace, etc.)
    this.shareContract.emit(this.contract); // Emite el contrato a compartir
  }

  // Función auxiliar para obtener la clase CSS según el estado
  getStatusClass(status: 'active' | 'pending' | 'finished'): string {
    return status; // El CSS ya usa 'active', 'pending', 'finished' como clases
  }
}
