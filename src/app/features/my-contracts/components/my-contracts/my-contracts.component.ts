import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs'; // Importante para manejar suscripciones

// Importa los servicios y la interfaz necesarios (ajusta las rutas si es necesario)
import { WalletService } from '../../../../core/services/wallet.service';
import { ContractBackendService, ContractReferenceDataForBackend } from '../../../../core/services/contract-backend.service';

@Component({
  standalone: false,
  selector: 'app-my-contracts',
  // standalone: false, // No necesitas 'standalone' aquí si está declarado en un módulo
  templateUrl: './my-contracts.component.html',
  styleUrls: ['./my-contracts.component.css'] // Cambiado de styleUrl a styleUrls (estándar)
})
export class MyContractsComponent implements OnInit, OnDestroy { // Implementa OnInit y OnDestroy

  contracts: ContractReferenceDataForBackend[] = []; // Usamos la interfaz importada
  isLoading = true; // Empezamos asumiendo que cargará algo
  userAddress: string | null = null;
  errorMessage: string | null = null; // Para mostrar errores al usuario

  // Variables para guardar las suscripciones y poder cancelarlas después
  private walletSubscription: Subscription | null = null;
  private contractsSubscription: Subscription | null = null;

  // Inyecta los servicios en el constructor
  constructor(
    private walletService: WalletService,
    private contractBackendService: ContractBackendService
  ) { }

  ngOnInit(): void {
    console.log('MyContractsComponent: ngOnInit');
    // Nos suscribimos a los cambios en la dirección del usuario del WalletService
    this.walletSubscription = this.walletService.userAddress$.subscribe(address => {
      this.isLoading = true; // Inicia carga cada vez que cambia la dirección
      this.errorMessage = null; // Limpia errores previos
      this.contracts = []; // Limpia contratos previos

      // Si hay una dirección, es que el usuario está conectado
      if (address) {
        this.userAddress = address;
        console.log('MyContractsComponent: Usuario conectado con dirección ->', this.userAddress);
        // Llamamos al método para cargar los contratos de este usuario
        this.loadContractsForUser(this.userAddress);
      } else {
        // Si no hay dirección, el usuario está desconectado
        this.userAddress = null;
        console.log('MyContractsComponent: Usuario desconectado.');
        this.isLoading = false; // Ya no está cargando
        // Preparamos un mensaje para mostrar en la UI
        this.errorMessage = "Por favor, conecta tu billetera para ver tus contratos.";
      }
    });
  }

  ngOnDestroy(): void {
    console.log('MyContractsComponent: ngOnDestroy - Cancelando suscripciones');
    // Es MUY importante cancelar las suscripciones cuando el componente se destruye
    // para evitar fugas de memoria (memory leaks).
    this.walletSubscription?.unsubscribe();
    this.contractsSubscription?.unsubscribe();
  }

  // Método que llama al servicio del backend para obtener los contratos
  loadContractsForUser(address: string): void {
    this.isLoading = true; // Marcamos como cargando
    this.errorMessage = null; // Limpiamos errores

    // Cancelamos cualquier petición anterior de contratos si estaba en curso
    this.contractsSubscription?.unsubscribe();

    console.log(`MyContractsComponent: Llamando a getContractsForUser para ${address}`);
    this.contractsSubscription = this.contractBackendService.getContractsForUser(address)
      .subscribe({
        next: (fetchedContracts) => {
          // Éxito al recibir los contratos del backend
          console.log('MyContractsComponent: Contratos recibidos ->', fetchedContracts);
          // (Opcional pero recomendado) Filtra por si algún contrato viniera sin ABI o dirección
          this.contracts = fetchedContracts.filter(c => c.contractAddress && c.abi && c.abi.length > 0);
          if (this.contracts.length !== fetchedContracts.length) {
            console.warn("MyContractsComponent: Se filtraron algunos contratos recibidos por faltar dirección o ABI.");
          }
          if (this.contracts.length === 0) {
            console.log("MyContractsComponent: No hay contratos válidos para mostrar.");
            // El componente grid/empty-state manejará el mensaje visual
          }
          this.isLoading = false; // Terminamos de cargar
        },
        error: (err: Error) => {
          // Ocurrió un error al llamar al backend
          console.error('MyContractsComponent: Error al cargar contratos desde el backend:', err);
          // Usamos el mensaje de error formateado por el servicio
          this.errorMessage = err.message || "Ocurrió un error inesperado al cargar los contratos.";
          this.isLoading = false; // Terminamos de cargar (con error)
          this.contracts = []; // Aseguramos que no se muestren contratos viejos
        }
      });
  }

  // --- (Opcional) Métodos para conectar la wallet ---
  // Si quieres añadir un botón en esta página para conectar si no lo está
  connectWallet(): void {
    console.log("MyContractsComponent: Solicitando conexión de wallet...");
    // Idealmente, el botón principal de conexión está en el Header,
    // pero puedes llamar al método del servicio desde aquí también si es necesario.
    this.walletService.connectWallet();
  }

  // --- (Opcional) Handlers para eventos de componentes hijos ---
  // Estos los llenaremos más tarde cuando implementemos la lectura on-chain
  handleViewDetails(contract: ContractReferenceDataForBackend): void {
    console.log("Placeholder: Ver detalles para ->", contract.name);
    // PRÓXIMO PASO: Llamar a ContractInteractionService aquí
  }
  handleSearch(term: string): void { console.log('Placeholder: Buscar ->', term); }
  handleFilter(): void { console.log('Placeholder: Aplicar Filtro'); }

}