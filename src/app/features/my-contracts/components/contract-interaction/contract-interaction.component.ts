// src/app/features/my-contracts/components/contract-interaction/contract-interaction.component.ts
import { Component, Inject, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
// Importa las referencias necesarias de Material Dialog
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ContractInteractionService } from '../../../../core/services/contract-interaction.service'; // Ajusta ruta
// Importa las interfaces si las tienes definidas
import { ContractReferenceDataForBackend } from '../../../../core/services/contract-backend.service'; // Ajusta ruta

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
  // Mapa para guardar argumentos introducidos por el usuario (para inputs dinámicos)
  functionArgs = new Map<string, any[]>();

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
    if (!this.contractAbi || !Array.isArray(this.contractAbi)) return;

    console.log("InteractionComponent: Analizando ABI", this.contractAbi);

    this.readableFunctions = this.contractAbi
      .filter(item => item.type === 'function' && (item.stateMutability === 'view' || item.stateMutability === 'pure'))
      .map(item => {
        // Inicializa los argumentos para esta función en el mapa
        this.functionArgs.set(item.name!, new Array(item.inputs?.length || 0).fill('')); // Inicializa array de strings vacíos

        return { // Creamos el objeto ReadableFunction
          name: item.name!,
          inputs: item.inputs || [],
          outputs: item.outputs || [],
          isLoading: false,
          result: undefined,
          error: undefined
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log("InteractionComponent: Funciones de lectura encontradas:", this.readableFunctions);
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

  // Método para actualizar los argumentos del mapa cuando cambian en el input
  onArgumentChange(funcName: string, argIndex: number, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const currentArgs = this.functionArgs.get(funcName) || [];
    currentArgs[argIndex] = inputElement.value; // Actualiza el valor en el array
    this.functionArgs.set(funcName, currentArgs);
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