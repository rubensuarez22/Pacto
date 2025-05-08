import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Subscription } from 'rxjs'; // Importante para manejar suscripciones

// Importa los servicios y la interfaz necesarios (ajusta las rutas si es necesario)
import { WalletService } from '../../../../core/services/wallet.service';
import { ContractBackendService, ContractReferenceDataForBackend, DeleteRequestPayload } from '../../../../core/services/contract-backend.service';
import { MatDialog } from '@angular/material/dialog';
import { ContractInteractionComponent, ContractInteractionData } from '../../components/contract-interaction/contract-interaction.component'; // Ajusta ruta
import { ContractInteractionService } from '../../../../core/services/contract-interaction.service'; // Necesitarás este servicio si haces renuncia de propiedad

import Swal from 'sweetalert2';

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
  private deleteSubscription: Subscription | null = null;
  // Variables para guardar las suscripciones y poder cancelarlas después
  private walletSubscription: Subscription | null = null;
  private contractsSubscription: Subscription | null = null;

  // Inyecta los servicios en el constructor
  constructor(
    private walletService: WalletService,
    private contractBackendService: ContractBackendService,
    public dialog: MatDialog, // Inyecta el servicio de Dialog
    private ngZone: NgZone
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
  // 3. Implementa el handler para el evento (interact)
  handleInteract(contract: ContractReferenceDataForBackend): void {
    if (!contract.abi || contract.abi.length === 0) {
      Swal.fire('Error', 'El ABI para este contrato no está disponible.', 'error');
      return;
    }

    console.log(`Abriendo modal de interacción para ${contract.name} (${contract.contractAddress})`);

    // Abre el modal pasando ContractInteractionComponent y los datos necesarios
    this.dialog.open<ContractInteractionComponent, ContractInteractionData>(ContractInteractionComponent, {
      width: '700px', // Ancho del modal
      maxWidth: '95vw', // Ancho máximo en pantallas pequeñas
      data: { // Objeto que se inyecta en el componente del modal vía MAT_DIALOG_DATA
        contractAddress: contract.contractAddress,
        contractAbi: contract.abi,
        contractName: contract.name // Pasamos el nombre también
      }
      // Puedes añadir más configuraciones aquí (ej: panelClass para estilos)
    });
  }

  async handleDeleteRequest(contractToDelete: ContractReferenceDataForBackend): Promise<void> {
    console.log('Recibida solicitud para borrar:', contractToDelete);
    console.log('>>> DELETE_DEBUG: 3. handleDeleteRequest llamado en MyContractsComponent con:', contractToDelete); // <-- AÑADIR
    console.log('>>> DELETE_DEBUG: 3a. Mostrando Swal de confirmación...')
    // 1. Confirmación MUY CLARA al usuario
    const confirmation = await Swal.fire({
      title: `¿Borrar "${contractToDelete.name}"?`,
      html: `Estás a punto de eliminar la referencia a este contrato de tu lista en PACTO.<br><br>
             <strong style="color: yellow;">IMPORTANTE:</strong> Esta acción <strong>NO</strong> borra el contrato de la blockchain (es inmutable). Simplemente desaparecerá de tu vista en esta aplicación.<br><br>
             ¿Estás seguro?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar referencia',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33', // Color rojo para borrar
      cancelButtonColor: '#3085d6',
      background: 'rgba(42, 26, 64, 0.95)', // Fondo oscuro
      color: '#ffffff', // Texto blanco
    });

    if (!confirmation.isConfirmed) {
      console.log('>>> DELETE_DEBUG: 3b. Borrado cancelado en Swal.')
      console.log('Borrado cancelado por el usuario.');
      return; // Usuario canceló
    }
    console.log('>>> DELETE_DEBUG: 3c. Swal confirmado.');

    // 2. Obtener signer y firmar mensaje de autorización
    console.log('>>> DELETE_DEBUG: 3d. Obteniendo signer...')
    let signer = await this.walletService.signer
    const currentUserAddress = this.walletService.getCurrentAddress();

    // Comprobación adicional de seguridad
    if (!signer || !currentUserAddress) {
      Swal.fire('Error', 'No se pudo obtener la billetera conectada para firmar.', 'error');
      return;
    }
    if (!contractToDelete.firestoreId) {
      Swal.fire('Error Interno', 'No se pudo obtener el ID de la referencia a borrar.', 'error');
      return;
    }
    console.log('>>> DELETE_DEBUG: 3f. Signer y datos OK.');

    const messageToSign = `Confirmo la eliminación de la referencia del contrato con ID: ${contractToDelete.firestoreId}`;
    let signature;
    try {
      console.log('>>> DELETE_DEBUG: 3g. Solicitando firma del mensaje...'); // <-- AÑADIR

      console.log('Solicitando firma para borrar...');
      signature = await signer.signMessage(messageToSign);
    } catch (signError: any) {
      console.error("Error al firmar mensaje de borrado:", signError);
      let signErrorMessage = 'La firma del mensaje fue cancelada o falló.';
      if (signError.code === 4001 || signError.code === "ACTION_REJECTED") {
        signErrorMessage = "Rechazaste la firma del mensaje en tu billetera.";
      }
      Swal.fire('Firma Requerida', signErrorMessage, 'warning');
      return;
    }

    // 3. Preparar y llamar al backend para borrar
    const payload: DeleteRequestPayload = {
      signedMessage: messageToSign,
      signature: signature,
      userAddress: currentUserAddress // Dirección que firmó
    };

    this.deleteSubscription?.unsubscribe(); // Cancela borrado anterior si lo hubiera

    console.log(`Llamando a backend para borrar doc ID: ${contractToDelete.firestoreId}`);
    this.deleteSubscription = this.contractBackendService.deleteContractReference(contractToDelete.firestoreId, payload)
      .subscribe({
        next: (response) => {
          this.ngZone.run(() => { // Asegura actualización de UI
            console.log('Respuesta del borrado:', response.message);
            Swal.fire('¡Eliminado!', 'La referencia del contrato ha sido eliminada de tu lista.', 'success');
            // Elimina el contrato de la lista local para actualizar la UI inmediatamente
            this.contracts = this.contracts.filter(c => c.firestoreId !== contractToDelete.firestoreId);
            // O podrías volver a llamar a loadContractsForUser(this.userAddress!) si prefieres recargar desde el backend
          });
        },
        error: (error: Error) => {
          this.ngZone.run(() => { // Asegura actualización de UI
            console.error('Error al borrar referencia vía backend:', error);
            Swal.fire('Error', `No se pudo borrar la referencia: ${error.message}`, 'error');
          });
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