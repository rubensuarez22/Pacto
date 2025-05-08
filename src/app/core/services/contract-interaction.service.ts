// src/app/core/services/contract-interaction.service.ts
import { Injectable } from '@angular/core';
import { ethers, BrowserProvider, JsonRpcSigner, Contract, TransactionResponse, TransactionReceipt } from 'ethers';
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

  async getProvider(): Promise<BrowserProvider | undefined> { /* ... código anterior ... */
    if (!this.provider) { await this.initializeProvider(); } return this.provider;
  }
  async getSigner(): Promise<JsonRpcSigner | undefined> { /* ... código anterior ... */
    if (!this.signer) { await this.initializeProvider(); } return this.signer;
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
  // --- NUEVO MÉTODO PARA ESCRIBIR EN CONTRATO ---
  /**
   * Llama a una función de escritura (nonpayable/payable) del contrato.
   * Requiere que el usuario confirme la transacción en su wallet.
   * @param contractAddress Dirección del contrato.
   * @param contractAbi ABI del contrato.
   * @param functionName Nombre de la función a llamar.
   * @param args Array de argumentos para la función.
   * @param valueString (Opcional) Cantidad de ETH a enviar (como string, ej: "0.1") para funciones 'payable'.
   * @returns Una Promesa que resuelve con la respuesta de la transacción (TransactionResponse).
   */
  async writeContractFunction(
    contractAddress: string,
    contractAbi: any[],
    functionName: string,
    args: any[] = [],
    valueString?: string // Valor en ETH como string para funciones payable
  ): Promise<TransactionResponse> {

    const currentSigner = await this.getSigner(); // Necesitamos el signer para escribir
    if (!currentSigner) {
      throw new Error('No se pudo obtener el firmante (signer). Conecta tu billetera.');
    }

    try {
      // Creamos la instancia del contrato CONECTADA AL SIGNER
      const contract = new Contract(contractAddress, contractAbi, currentSigner);
      console.log(`ContractInteractionService: Escribiendo [${functionName}] en [${contractAddress}] con args:`, args, `y valor: ${valueString || '0'} ETH`);

      // Prepara las opciones de la transacción (para funciones payable)
      let txOptions: any = {};
      if (valueString && parseFloat(valueString) > 0) {
        txOptions.value = ethers.parseEther(valueString); // Convierte ETH string a Wei (BigInt)
      }

      // Llama a la función del contrato. Ethers maneja la llamada al signer.
      // Si la función requiere argumentos y opciones (value), se pasan al final.
      const txResponse: TransactionResponse = await contract[functionName](...args, txOptions);

      console.log(`ContractInteractionService: Transacción enviada para ${functionName}. Hash:`, txResponse.hash);
      return txResponse; // Devuelve la respuesta de la transacción inicial

    } catch (error: any) {
      console.error(`ContractInteractionService: Error escribiendo ${functionName} en ${contractAddress}:`, error);
      // Formatear errores comunes de transacción
      let specificError = error.reason || error.message || 'Error desconocido al enviar transacción.';
      if (error.code === 4001 || error.code === "ACTION_REJECTED") {
        specificError = "Transacción rechazada en la billetera.";
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        specificError = "Fondos insuficientes para cubrir el gas + valor (si aplica).";
      } else if (error.message?.includes('invalid BigNumber value')) {
        specificError = "Valor inválido (ej. formato ETH incorrecto o argumento numérico).";
      }
      // Considera otros códigos de error RPC si es necesario
      throw new Error(specificError);
    }
  }

  // Opcional: Método para esperar la confirmación de una transacción
  async waitForTransaction(txResponse: TransactionResponse, confirmations: number = 1): Promise<TransactionReceipt | null> {
    console.log(`Esperando ${confirmations} confirmaciones para tx: ${txResponse.hash}`);
    try {
      const receipt = await txResponse.wait(confirmations); // Espera N confirmaciones
      console.log('Transacción confirmada!', receipt);
      return receipt;
    } catch (error) {
      console.error(`Error esperando la transacción ${txResponse.hash}:`, error);
      throw error; // Re-lanza el error
    }
  }
}