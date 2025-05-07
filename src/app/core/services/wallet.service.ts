// src/app/core/services/wallet.service.ts
import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { ethers } from 'ethers'; // Importa ethers

// Declaración global
declare global {
  interface Window {
    // Mantenemos el tipo Eip1193Provider para el provider de ethers,
    // pero castearemos a 'any' para los listeners de eventos.
    ethereum?: ethers.Eip1193Provider;
  }
}

@Injectable({
  providedIn: 'root'
})
export class WalletService implements OnDestroy {
  // --- Propiedades Públicas ---
  public signer: ethers.Signer | null = null;

  // --- Subjects privados ---
  private readonly _userAddress = new BehaviorSubject<string | null>(null);
  private readonly _isConnecting = new BehaviorSubject<boolean>(false);
  private readonly _isMetaMaskInstalled = new BehaviorSubject<boolean>(false);
  private provider: ethers.BrowserProvider | null = null;
  // Cambiamos el tipo de la suscripción para que coincida con el listener
  private accountsChangedSubscription?: (accounts: string[]) => void | Promise<void>;

  // --- Observables públicos ---
  readonly userAddress$: Observable<string | null> = this._userAddress.asObservable();
  readonly isConnecting$: Observable<boolean> = this._isConnecting.asObservable();
  readonly isMetaMaskInstalled$: Observable<boolean> = this._isMetaMaskInstalled.asObservable();
  readonly isConnected$: Observable<boolean> = this.userAddress$.pipe(map(address => !!address));
  readonly avatarSrc$: Observable<string> = this.isConnected$.pipe(
    map(isConnected => isConnected
      ? 'assets/images/lobito.png' // Asegúrate que esta ruta sea correcta
      : 'assets/avatar-placeholder.jpg'
    )
  );

  constructor(private ngZone: NgZone) {
    this.initializeWalletState();
  }

  private initializeWalletState(): void {
    // Usamos 'any' temporalmente para verificar 'window.ethereum' si el tipo EIP1193 da problemas aquí
    const ethereumProvider = window.ethereum as any; 

    if (typeof ethereumProvider !== 'undefined') {
      this._isMetaMaskInstalled.next(true);
      this.provider = new ethers.BrowserProvider(ethereumProvider);
      console.log('WalletService: MetaMask está instalado y provider creado.');

      this.checkExistingConnection();

      // Escuchar cambios de cuenta
      this.accountsChangedSubscription = async (accounts: string[]) => { // Marcado como async
        this.ngZone.run(async () => {
          const newAddress = accounts.length > 0 ? accounts[0] : null;
          const currentAddress = this._userAddress.getValue(); // Obtener valor actual

          if (newAddress !== currentAddress) {
            this._userAddress.next(newAddress);
            if (newAddress && this.provider) {
              try {
                this.signer = await this.provider.getSigner();
                console.log('WalletService: Cuenta cambiada y signer actualizado para:', newAddress);
              } catch (error) {
                 console.error("WalletService: Error obteniendo signer tras cambio de cuenta:", error);
                 this.signer = null; // Limpiar si falla
                 this._userAddress.next(null); // También limpiar dirección si falla obtener signer
              }
            } else {
              this.signer = null;
              console.log('WalletService: Cuenta desconectada, signer limpiado.');
            }
          }
          // No necesitamos el 'else if' separado, la condición newAddress !== currentAddress
          // y la lógica interna ya cubren el caso de desconexión (newAddress será null).
        });
      };
      
      // CORRECCIÓN: Castear a 'any' para usar '.on()'
      if (ethereumProvider && typeof ethereumProvider.on === 'function') {
        (ethereumProvider as any).on('accountsChanged', this.accountsChangedSubscription);
        console.log('WalletService: Suscrito a accountsChanged.');
      } else {
        console.warn('WalletService: ethereumProvider.on no está disponible.');
      }


    } else {
      this._isMetaMaskInstalled.next(false);
      console.log('WalletService: MetaMask no está instalado.');
    }
  }

  private async checkExistingConnection(): Promise<void> {
    if (!this.provider) {
      console.log("WalletService: Provider no disponible para checkExistingConnection.");
      return;
    }
    try {
      const accounts = await this.provider.listAccounts();
      console.log("WalletService: Cuentas encontradas por listAccounts:", accounts);
      if (accounts && accounts.length > 0) {
        const signer = await this.provider.getSigner(); // Obtiene el signer asociado a la primera cuenta
        const address = await signer.getAddress();
        const currentAddress = this._userAddress.getValue();

        if (address !== currentAddress) {
           this.signer = signer; // Actualiza el signer
           this.ngZone.run(() => {
             this._userAddress.next(address); // Actualiza la dirección
             console.log('WalletService: Conexión existente/Signer obtenido para:', address);
           });
        } else if (!this.signer) {
           // Si la dirección es la misma pero no teníamos signer, lo asignamos
           this.signer = signer;
           console.log('WalletService: Signer asignado para conexión existente:', address);
        }

      } else {
         if (this.signer || this._userAddress.getValue()){
             this.ngZone.run(() => {
                 this.signer = null;
                 this._userAddress.next(null);
                 console.log('WalletService: No hay conexión existente autorizada, estado limpiado.');
             });
         }
      }
    } catch (error) {
      console.error('WalletService: Error verificando conexión existente:', error);
      this.ngZone.run(() => {
        this.signer = null;
        this._userAddress.next(null);
      });
    }
  }

  async connectWallet(): Promise<void> {
    if (!this._isMetaMaskInstalled.getValue() || !this.provider) {
      alert('Por favor, instala MetaMask.');
      return;
    }

    if (this.signer) {
      try {
        const address = await this.signer.getAddress();
        console.log('WalletService: Ya estás conectado con:', address);
        // Quizás forzar una re-obtención del signer para asegurar que es el actual
        this.signer = await this.provider.getSigner();
        this._userAddress.next(await this.signer.getAddress()); // Reafirmar dirección
        return;
      } catch (error) {
         console.error("WalletService: Error obteniendo dirección del signer existente:", error);
         // Forzar reconexión si falla obtener la dirección
         this.signer = null;
         this._userAddress.next(null);
      }
    }

    this._isConnecting.next(true);
    try {
      // Usamos send para solicitar cuentas, luego getSigner
      await this.provider.send("eth_requestAccounts", []); // Abre MetaMask para conectar
      this.signer = await this.provider.getSigner(); // Obtiene el signer
      const address = await this.signer.getAddress();

      this.ngZone.run(() => {
        this._userAddress.next(address);
        console.log('WalletService: Wallet conectada y signer obtenido para:', address);
      });
    } catch (error: any) {
       console.error('WalletService: Error al conectar wallet/obtener signer:', error);
       this.ngZone.run(() => {
           this.signer = null;
           this._userAddress.next(null);
           if (error.code === 4001) {
              alert('Rechazaste la conexión de la billetera.');
           } else if (error.code === -32002) {
              alert('Ya hay una solicitud de conexión pendiente en MetaMask. Por favor, revísala.');
           } else {
              alert(`Ocurrió un error al conectar: ${error.message || error}`);
           }
       });
    } finally {
       this.ngZone.run(() => {
          this._isConnecting.next(false);
       });
    }
  }

  disconnectWallet(): void {
    if (this.signer) {
      console.log('WalletService: Limpiando estado local para:', this._userAddress.getValue());
      this.signer = null;
      this._userAddress.next(null);
    } else {
      console.log('WalletService: disconnectWallet llamado pero no había signer.');
    }
  }

  ngOnDestroy(): void {
    const ethereumProvider = window.ethereum as any; // Castear a any para removeListener
    if (ethereumProvider && typeof ethereumProvider.removeListener === 'function' && this.accountsChangedSubscription) {
      // CORRECCIÓN: Castear a 'any' para usar '.removeListener()'
      (ethereumProvider as any).removeListener('accountsChanged', this.accountsChangedSubscription);
      console.log('WalletService: Listener de accountsChanged removido.');
    }
  }

  getCurrentAddress(): string | null {
    return this._userAddress.getValue();
  }
}
