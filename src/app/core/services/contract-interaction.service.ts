// src/app/core/services/contract-interaction.service.ts
import { Injectable } from '@angular/core';
import { ethers, BrowserProvider, JsonRpcSigner, Contract } from 'ethers'; // v6

declare var window: any; // Para window.ethereum

@Injectable({
  providedIn: 'root'
})
export class ContractInteractionService {
  private provider?: BrowserProvider;
  private signer?: JsonRpcSigner;

  constructor() {
    this.initializeProvider(); // Intenta inicializar al arrancar
  }

  // Intenta inicializar o reconectar si es necesario
  // Nota: WalletService ya hace algo similar, podrías centralizar esto
  //       pero por ahora lo dejamos aquí para que este servicio sea autocontenido.
  async initializeProvider(): Promise<boolean> {
    if (typeof window.ethereum !== 'undefined') {
      try {
        this.provider = new ethers.BrowserProvider(window.ethereum, 'any');
        // Para leer no siempre se necesita el signer, pero lo obtenemos
        // por si la wallet no está conectada aún.
        this.signer = await this.provider.getSigner();
        console.log('ContractInteractionService: Provider Ethers inicializado.');
        return true;
      } catch (error) {
        console.error('ContractInteractionService: Error inicializando provider Ethers:', error);
        this.provider = undefined; this.signer = undefined;
        return false;
      }
    } else {
      console.warn('ContractInteractionService: No se detectó proveedor Ethereum.');
      return false;
    }
  }

  // Método principal para leer datos de funciones 'view' o 'pure'
  async readContractFunction(
    contractAddress: string,
    contractAbi: any[],
    functionName: string,
    args: any[] = []
  ): Promise<any> {

    if (!this.provider) {
      const initialized = await this.initializeProvider();
      if (!initialized || !this.provider) {
        throw new Error('Proveedor Ethereum no disponible. Conecta tu billetera.');
      }
    }

    // Opcional: Verificar Red (necesitarías pasar el networkId esperado)
    // const network = await this.provider.getNetwork();
    // if (network.chainId !== EXPECTED_NETWORK_ID) { ... }

    try {
      // Crea la instancia del contrato usando sólo el provider (para lecturas)
      const contract = new Contract(contractAddress, contractAbi, this.provider);
      console.log(`ContractInteractionService: Leyendo [<span class="math-inline">\{functionName\}\] de \[</span>{contractAddress}] con args:`, args);

      // Llama a la función (ethers se encarga de la llamada RPC)
      const result = await contract[functionName](...args);

      console.log(`ContractInteractionService: Resultado para ${functionName}:`, result);
      // Formateo básico de BigInt a String
      if (typeof result === 'bigint') { // <-- Corrección usando typeof
        return result.toString();
      }
      // Podrías añadir más formateo aquí si es necesario
      return result;

    } catch (error: any) {
      console.error(`ContractInteractionService: Error leyendo ${functionName} en ${contractAddress}:`, error);
      let specificError = error.reason || error.message || 'Error desconocido al leer contrato.';
      if (error.code === 'CALL_EXCEPTION') {
        specificError = `Error al llamar la función "${functionName}". Verifica el ABI, la dirección, la red y si la función existe.`;
      }
      throw new Error(specificError);
    }
  }
}