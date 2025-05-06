// src/app/layout/header/header.component.ts (o donde esté tu header)
import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../../core/services/wallet.service'; // Ajusta la ruta
import { Observable } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: false,
  // imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  // Propiedades que ahora son Observables del servicio
  userAddress$: Observable<string | null>;
  isConnected$: Observable<boolean>;
  isConnecting$: Observable<boolean>;
  isMetaMaskInstalled$: Observable<boolean>;
  avatarSrc$: Observable<string>;

  constructor(public walletService: WalletService) { // Inyecta el servicio (público para acceso fácil en template)
    this.userAddress$ = this.walletService.userAddress$;
    this.isConnected$ = this.walletService.isConnected$;
    this.isConnecting$ = this.walletService.isConnecting$;
    this.isMetaMaskInstalled$ = this.walletService.isMetaMaskInstalled$;
    this.avatarSrc$ = this.walletService.avatarSrc$; 
  }

  ngOnInit(): void {
    // Ya no necesita la lógica de inicialización aquí, el servicio se encarga.
  }

  // Método para conectar (ahora solo llama al servicio)
  connect(): void {
    this.walletService.connectWallet();
  }

  // Devuelve una versión acortada de la dirección (podría moverse al servicio también)
  getDisplayAddress(address: string | null): string | null {
    if (!address) return null;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * @notice Called when the user clicks the avatar/logo to disconnect.
   */
  logout(): void {
    console.log('HeaderComponent: Logout action triggered.');
    this.walletService.disconnectWallet();
  }
}