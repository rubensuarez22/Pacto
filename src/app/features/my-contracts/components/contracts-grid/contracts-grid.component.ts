import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
@Component({
  selector: 'app-contracts-grid',
  standalone: false,
  templateUrl: './contracts-grid.component.html',
  styleUrl: './contracts-grid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContractsGridComponent {
  @Input() contracts: any[] = [];
  @Input() isLoading = true;
  constructor() { }

  // Función trackBy para optimizar el rendimiento de *ngFor
  // Ayuda a Angular a identificar qué items han cambiado, añadido o eliminado
  trackByContractId(index: number, contract: any): number | string {
    // Usa una propiedad única del contrato si existe (ej: contract.id o contract.address)
    // Si no, usa el índice como último recurso (menos óptimo)
    return contract?.id ?? contract?.address ?? index;
  }
}
