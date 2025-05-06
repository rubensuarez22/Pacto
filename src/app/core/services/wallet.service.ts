// src/app/core/services/wallet.service.ts
import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';

// Declaración global (si no la tienes en otro archivo global)
declare global {
  interface Window {
    ethereum?: any;
  }
}

@Injectable({
  providedIn: 'root' // Disponible en toda la aplicación
})
export class WalletService implements OnDestroy {
  // --- Subjects privados para manejar el estado internamente ---
  private readonly _userAddress = new BehaviorSubject<string | null>(null);
  private readonly _isConnecting = new BehaviorSubject<boolean>(false);
  private readonly _isMetaMaskInstalled = new BehaviorSubject<boolean>(false);
  private accountsChangedSubscription?: (accounts: string[]) => void;

  // --- Observables públicos para que los componentes se suscriban ---
  readonly userAddress$: Observable<string | null> = this._userAddress.asObservable();
  readonly isConnecting$: Observable<boolean> = this._isConnecting.asObservable();
  readonly isMetaMaskInstalled$: Observable<boolean> = this._isMetaMaskInstalled.asObservable();

  // Observable derivado para saber fácilmente si está conectado
  readonly isConnected$: Observable<boolean> = this._userAddress.pipe(
    map(address => !!address) // Convierte la dirección (o null) a booleano
  );

  readonly avatarSrc$: Observable<string> = this.isConnected$.pipe(
    map(isConnected => isConnected
      ? 'assets/images/lobito.png'  // <-- Ruta al logo de MetaMask
      : 'assets/avatar-placeholder.jpg'   // <-- Ruta al placeholder por defecto
    )
  );

  constructor(private ngZone: NgZone) {
    this.initializeWalletState();
  }

  private initializeWalletState(): void {
    if (typeof window.ethereum !== 'undefined') {
      this._isMetaMaskInstalled.next(true);
      console.log('WalletService: MetaMask está instalado.');

      this.checkExistingConnection();

      // Escuchar cambios de cuenta
      this.accountsChangedSubscription = (accounts: string[]) => {
        this.ngZone.run(() => { // Siempre dentro de NgZone
          const newAddress = accounts.length > 0 ? accounts[0] : null;
          if (newAddress !== this._userAddress.getValue()) { // Solo actualizar si cambia
             this._userAddress.next(newAddress);
             console.log('WalletService: Cuenta cambiada a:', newAddress);
          }
        });
      };
      window.ethereum.on('accountsChanged', this.accountsChangedSubscription);

      // Podrías escuchar 'chainChanged' aquí también si es necesario
      // window.ethereum.on('chainChanged', (chainId: string) => { ... });

    } else {
      this._isMetaMaskInstalled.next(false);
      console.log('WalletService: MetaMask no está instalado.');
    }
  }

  private async checkExistingConnection(): Promise<void> {
    if (!this._isMetaMaskInstalled.getValue()) return;
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0 && !this._userAddress.getValue()) {
         this.ngZone.run(() => {
            this._userAddress.next(accounts[0]);
            console.log('WalletService: Conexión existente encontrada:', accounts[0]);
         });
      }
    } catch (error) {
      console.error('WalletService: Error verificando conexión existente:', error);
    }
  }

  async connectWallet(): Promise<void> {
    if (!this._isMetaMaskInstalled.getValue()) {
      alert('Por favor, instala MetaMask.');
      // Opcional: Redirigir
      // window.open('https://metamask.io/download/', '_blank');
      return;
    }

    if (this._userAddress.getValue()) {
      console.log('WalletService: Ya estás conectado con:', this._userAddress.getValue());
      return;
    }

    this._isConnecting.next(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        this.ngZone.run(() => {
          this._userAddress.next(accounts[0]);
          console.log('WalletService: Wallet conectada:', accounts[0]);
        });
      }
    } catch (error: any) {
       console.error('WalletService: Error al conectar wallet:', error);
       this.ngZone.run(() => { // Asegurar que el estado de error se actualice en la zona
           if (error.code === 4001) {
              alert('Rechazaste la conexión de la billetera.');
           } else {
              alert(`Ocurrió un error al conectar: ${error.message || error}`);
           }
       });
    } finally {
       this.ngZone.run(() => {
          this._isConnecting.next(false); // Asegurar que isConnecting vuelva a false
       });
    }
  }

  /**
   * @notice Clears the connected wallet address from the application's state.
   * Effectively logs the user out from the dApp's perspective.
   */
  disconnectWallet(): void {
    if (this._userAddress.getValue()) { // Check if actually connected
      console.log('WalletService: Clearing local wallet state for address:', this._userAddress.getValue());
      this._userAddress.next(null); // Set address to null to signal disconnection
    } else {
      console.log('WalletService: disconnectWallet called but no address was stored.');
    }
  }

  // Limpiar listeners al destruir el servicio (aunque con providedIn: 'root'
  // el servicio vive mientras la app viva, es buena práctica tenerlo)
  ngOnDestroy(): void {
    if (window.ethereum && this.accountsChangedSubscription) {
      window.ethereum.removeListener('accountsChanged', this.accountsChangedSubscription);
      console.log('WalletService: Listener de accountsChanged removido.');
    }
  }

  // --- Getters simples para acceso no reactivo (usar con cuidado) ---
  getCurrentAddress(): string | null {
    return this._userAddress.getValue();
  }
}