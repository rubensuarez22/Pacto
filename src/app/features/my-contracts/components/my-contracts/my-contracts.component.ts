import { Component, OnInit } from '@angular/core';
@Component({
  selector: 'app-my-contracts',
  standalone: false,
  templateUrl: './my-contracts.component.html',
  styleUrl: './my-contracts.component.css'
})
export class MyContractsComponent implements OnInit {
  contracts: any[] = []; // Aquí irán los datos de los contratos
  isLoading = true;

  // Inyecta tu servicio de contratos
  // constructor(private contractService: ContractService) { }
  constructor() { } // Constructor vacío por ahora

  ngOnInit(): void {
    // Aquí llamarías al servicio para cargar los contratos
    this.loadContracts();
  }

  loadContracts(): void {
    this.isLoading = true;
    // Simulación de carga de datos
    setTimeout(() => {
      // Reemplaza esto con la llamada real a tu servicio
      this.contracts = [
        { id: 1, title: 'Contrato de Compraventa', status: 'active', date: '15 Ene 2024', address: '0x742D...1f4e' },
        { id: 2, title: 'Acuerdo de Servicios', status: 'pending', date: '12 Ene 2024', address: '0x932d...f123' },
        { id: 3, title: 'Contrato de Arrendamiento', status: 'finished', date: '10 Ene 2024', address: '0x842d...7f89' }
      ];
      // Descomenta la línea de abajo para probar el estado vacío
      // this.contracts = [];
      this.isLoading = false;
    }, 1500); // Simula 1.5 segundos de carga
  }
}
