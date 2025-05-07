// src/app/features/create-contract/components/form/form.component.ts (o tu ruta)
import { Component, EventEmitter, Output, Input } from '@angular/core'; // Añade Input
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-form',
  standalone: false,
  templateUrl: './form.component.html',
  // styleUrls: ['./form.component.css'] // Asegúrate que la propiedad sea styleUrls (plural) si tienes CSS
  styleUrl: './form.component.css' // O styleUrl si solo es uno
})
export class FormComponent {
  // --- Inputs recibidos del componente padre ---
  @Input() isCompilationDone: boolean = false; // ¿Está listo el ABI/Bytecode?
  @Input() isCurrentlyDeploying: boolean = false; // ¿Está el padre desplegando?

  // --- Output para enviar los datos al padre ---
  @Output() formSubmitted = new EventEmitter<any>(); // Emite los datos del formulario

  constructor() { }

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      console.warn('Intento de envío con formulario inválido.');
      // Marcar todos los campos como tocados para mostrar errores
      Object.values(form.controls).forEach(control => {
        control.markAsTouched();
      });
      return;
    }

    // Verifica si la compilación está hecha ANTES de emitir
    if (!this.isCompilationDone) {
      console.warn('Intento de envío antes de la compilación.');
      // Notifica al usuario (podrías usar SweetAlert aquí también si quieres)
      alert("Por favor, compila un contrato primero (sube un archivo .sol).");
      return;
    }

    // Verifica si ya se está desplegando para evitar doble submit
    if (this.isCurrentlyDeploying) {
        console.warn("Intento de envío mientras ya se está desplegando.");
        return; // No hacer nada si ya está en proceso
    }

    console.log('FormComponent: Formulario Válido y listo para emitir. Datos:', form.value);
    // Emite los datos al componente padre (CreateContractComponent)
    this.formSubmitted.emit(form.value);

    // Opcional: Resetear el formulario después de enviarlo
    // form.resetForm();
  }
}
