// src/app/features/my-contracts/components/contract-interaction/contract-interaction.component.ts
import { Component, Inject, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
// Importa las referencias necesarias de Material Dialog
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ContractInteractionService } from '../../../../core/services/contract-interaction.service'; // Ajusta ruta
// Importa las interfaces si las tienes definidas
import { ContractReferenceDataForBackend } from '../../../../core/services/contract-backend.service'; // Ajusta ruta
import { ethers, TransactionResponse } from 'ethers'; // Importa TransactionResponse
// Interfaz para los datos que se pasan al modal
export interface ContractInteractionData {
  contractAddress: string;
  contractAbi: any[];
  contractName?: string; // Opcional: pasar también el nombre
}

// ... (Interfaces AbiItem, AbiInputOutput, ReadableFunction como antes) ...
interface AbiItem { name?: string; type: string; stateMutability?: string; inputs?: any[]; outputs?: any[]; }
interface AbiInputOutput { internalType: string; name: string; type: string; }
interface ReadableFunction { name: string; inputs: AbiInputOutput[]; outputs: AbiInputOutput[]; isLoading: boolean; result?: any; error?: string; args?: any[]; } // Añadimos args opcional
// Interfaz específica para escritura
interface WriteableFunction extends BaseFunctionUI {
  txHash?: string; // Para guardar el hash de la tx enviada
  receipt?: ethers.TransactionReceipt | null; // Para guardar el recibo una vez confirmado
  payableValue?: string; // Valor ETH para funciones payable
}
// Interfaz base para funciones en UI
interface BaseFunctionUI extends AbiItem {
  name: string;
  inputs: AbiInputOutput[];
  outputs: AbiInputOutput[];
  isLoading: boolean;
  error?: string;
}


@Component({
  standalone: false,
  selector: 'app-contract-interaction',
  templateUrl: './contract-interaction.component.html',
  styleUrls: ['./contract-interaction.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContractInteractionComponent implements OnInit {

  contractAddress!: string;
  contractAbi!: AbiItem[];
  contractName: string | undefined;

  readableFunctions: ReadableFunction[] = [];
  writeableFunctions: WriteableFunction[] = [];
  // Mapa para guardar argumentos introducidos por el usuario (para inputs dinámicos)
  functionArgs = new Map<string, any[]>();
  payableValue = new Map<string, string>(); // Valor ETH para funciones payable

  constructor(
    // Referencia al propio diálogo modal
    public dialogRef: MatDialogRef<ContractInteractionComponent>,
    // Injecta los datos pasados al modal
    @Inject(MAT_DIALOG_DATA) public data: ContractInteractionData,
    // Inyecta los otros servicios necesarios
    private contractInteractionService: ContractInteractionService,
    private cdRef: ChangeDetectorRef
  ) {
    // Asigna los datos recibidos a las propiedades del componente
    this.contractAddress = data.contractAddress;
    this.contractAbi = data.contractAbi;
    this.contractName = data.contractName; // Nombre opcional
  }

  ngOnInit(): void {
    this.parseAbiAndPrepareUI();
  }

  private parseAbiAndPrepareUI(): void {
    this.readableFunctions = [];
    this.writeableFunctions = [];
    this.functionArgs.clear();
    this.payableValue.clear();

    if (!this.contractAbi || !Array.isArray(this.contractAbi)) return;

    this.contractAbi.forEach(item => {
      if (item.type === 'function' && item.name) { // Asegura que sea función y tenga nombre
        const baseFuncData = {
          ...(item as Required<AbiItem>),
          inputs: item.inputs || [],
          outputs: item.outputs || [],
          isLoading: false,
          error: undefined
        };

        // Inicializa argumentos para esta función
        this.functionArgs.set(item.name, new Array(baseFuncData.inputs.length).fill(''));

        if (item.stateMutability === 'view' || item.stateMutability === 'pure') {
          this.readableFunctions.push({ ...baseFuncData, result: undefined });
        } else if (item.stateMutability === 'nonpayable' || item.stateMutability === 'payable') {
          const writeFunc: WriteableFunction = { ...baseFuncData, txHash: undefined, receipt: undefined };
          if (item.stateMutability === 'payable') {
            this.payableValue.set(item.name, ''); // Inicializa valor para payable
          }
          this.writeableFunctions.push(writeFunc);
        }
      }
    });

    this.readableFunctions.sort((a, b) => a.name.localeCompare(b.name));
    this.writeableFunctions.sort((a, b) => a.name.localeCompare(b.name));

    console.log("Funciones de Lectura Encontradas:", this.readableFunctions);
    console.log("Funciones de Escritura Encontradas:", this.writeableFunctions);
    this.cdRef.markForCheck();
  }


  // Método para llamar a una función (ahora obtiene args del mapa)
  async readFunction(func: ReadableFunction): Promise<void> {
    const args = this.functionArgs.get(func.name) || []; // Obtiene args del mapa
    // Aquí podrías añadir validación de los argumentos antes de llamar

    console.log(`Llamando a readFunction para: ${func.name} con args:`, args);
    func.isLoading = true;
    func.result = undefined;
    func.error = undefined;
    this.cdRef.markForCheck();

    try {
      const result = await this.contractInteractionService.readContractFunction(
        this.contractAddress,
        this.contractAbi,
        func.name,
        args // Pasa los argumentos recogidos
      );
      func.result = result;
      console.log(`Resultado para ${func.name}:`, result);
    } catch (error: any) {
      console.error(`Error leyendo ${func.name}:`, error);
      func.error = error.message || 'Error desconocido';
    } finally {
      func.isLoading = false;
      this.cdRef.markForCheck();
    }
  }

  // --- Lógica para Escribir ---
  async writeFunction(func: WriteableFunction): Promise<void> {
    const args = this.functionArgs.get(func.name) || [];
    const ethValue = func.stateMutability === 'payable' ? this.payableValue.get(func.name) : undefined;

    // --- Validación de Argumentos y Valor (MUY IMPORTANTE en la práctica) ---
    // Aquí deberías validar que los 'args' y 'ethValue' (si aplica) tengan el formato correcto
    // antes de enviarlos a ethers.js (ej. convertir números string a number/BigInt, validar direcciones)
    console.log(`Llamando a writeFunction para: ${func.name} con args:`, args, `y valor: ${ethValue}`);
    // ------------------------------------------------------------------------

    func.isLoading = true; func.txHash = undefined; func.receipt = undefined; func.error = undefined;
    this.cdRef.markForCheck(); // Muestra estado "enviando"

    try {
      // Llama al servicio para enviar la transacción
      const txResponse = await this.contractInteractionService.writeContractFunction(
        this.contractAddress,
        this.contractAbi,
        func.name,
        args,
        ethValue // Pasa el valor si es payable
      );

      func.txHash = txResponse.hash; // Guarda el hash inmediatamente
      console.log(`Transacción enviada para ${func.name}. Hash: ${func.txHash}`);
      this.cdRef.markForCheck(); // Muestra el hash

      // Opcional: Esperar confirmación
      func.isLoading = true; // Sigue cargando mientras espera confirmación
      func.error = undefined; // Limpia error previo
      this.cdRef.markForCheck();
      console.log(`Esperando confirmación para tx: ${func.txHash}...`);

      const receipt = await this.contractInteractionService.waitForTransaction(txResponse); // Espera 1 confirmación por defecto

      func.receipt = receipt; // Guarda el recibo
      if (receipt?.status === 1) {
        console.log(`Transacción para ${func.name} confirmada exitosamente!`);
        func.error = undefined; // Limpia error si éxito
      } else {
        console.error(`Transacción para ${func.name} falló o fue revertida. Recibo:`, receipt);
        func.error = `Transacción falló (status=${receipt?.status})`;
      }

    } catch (error: any) {
      console.error(`Error ejecutando writeFunction ${func.name}:`, error);
      func.error = error.message || 'Error desconocido'; // Guarda el error (ej. rechazo de usuario)
    } finally {
      func.isLoading = false; // Termina la carga (ya sea éxito o error)
      this.cdRef.markForCheck(); // Actualiza la UI final
    }
  }

  // Método para actualizar los argumentos del mapa cuando cambian en el input
  onArgumentChange(funcName: string, argIndex: number, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const currentArgs = this.functionArgs.get(funcName) || [];
    currentArgs[argIndex] = inputElement.value; // Actualiza el valor en el array
    this.functionArgs.set(funcName, currentArgs);
  }

  // Actualiza el valor de ETH para funciones payable
  onPayableValueChange(funcName: string, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.payableValue.set(funcName, inputElement.value);
    // console.log('Payable Map:', this.payableValue); // Para depuración
  }
  // Método para cerrar el modal
  closeDialog(): void {
    this.dialogRef.close();
  }

  // Helper para formatear resultados (como antes)
  formatResult(result: any): string {
    if (result === undefined || result === null) return 'N/A';
    if (typeof result === 'object') {
      try { return JSON.stringify(result); } catch { return String(result); }
    }
    return String(result);
  }
}