import { Component, EventEmitter, Output } from '@angular/core';
@Component({
  selector: 'app-toolbar',
  standalone: false,
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.css'
})
export class ToolbarComponent {

  // --- Eventos para notificar al componente padre ---
  // Emite el término de búsqueda actual
  @Output() searchTermChanged = new EventEmitter<string>();
  // Emite el filtro de estado seleccionado (o un evento para abrir el dropdown)
  @Output() statusFilterClicked = new EventEmitter<void>(); // Simplificado por ahora
  // Emite el filtro de fecha seleccionado (o un evento para abrir el dropdown)
  @Output() dateFilterClicked = new EventEmitter<void>(); // Simplificado por ahora
  // Emite un evento cuando se hace clic en el botón general de filtros
  @Output() filtersOpened = new EventEmitter<void>();

  constructor() { }

  // --- Métodos para manejar interacciones ---

  // Se llama cada vez que el usuario escribe en el input de búsqueda
  onSearchInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const searchTerm = inputElement.value;
    console.log('Search term:', searchTerm); // Para depuración
    this.searchTermChanged.emit(searchTerm); // Emite el término
  }

  // Placeholder para manejar clic en el botón/dropdown de Estado
  onStatusClick(): void {
    console.log('Status filter clicked');
    // Aquí implementarías la lógica del dropdown/modal y luego emitirías el valor seleccionado
    this.statusFilterClicked.emit(); // Por ahora solo emite que se hizo clic
  }

  // Placeholder para manejar clic en el botón/dropdown de Fecha
  onDateClick(): void {
    console.log('Date filter clicked');
    this.dateFilterClicked.emit();
  }

  // Placeholder para manejar clic en el botón de Filtros
  onFiltersClick(): void {
    console.log('Filters button clicked');
    this.filtersOpened.emit();
  }
}
