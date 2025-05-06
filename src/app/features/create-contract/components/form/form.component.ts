import { Component, EventEmitter, Output } from '@angular/core';
import { NgForm } from '@angular/forms'; // Necesario si usas #contractNgForm="ngForm"

@Component({
  selector: 'app-form',
  standalone: false,
  templateUrl: './form.component.html',
  styleUrl: './form.component.css'
})
export class FormComponent {
  // Evento para notificar al padre cuando el formulario se envía (con los datos)
  @Output() formSubmitted = new EventEmitter<any>(); // Puedes definir una interfaz para los datos

  constructor() { }

  onSubmit(form: NgForm): void { // Recibimos la referencia del formulario
    if (form.invalid) {
      console.warn('Intento de envío con formulario inválido.');
      // Marcar todos los campos como tocados para mostrar errores si están ocultos
      Object.values(form.controls).forEach(control => {
        control.markAsTouched();
      });
      return; // No continuar si es inválido
    }

    console.log('Formulario Válido. Datos:', form.value);
    // Aquí procesarías los datos o los emitirías al componente padre
    this.formSubmitted.emit(form.value);
  }
}
