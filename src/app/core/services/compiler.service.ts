// src/app/core/services/compiler.service.ts
import { Injectable } from '@angular/core';

// Declara 'solc' como una variable global que TypeScript reconocerá.
// Esto asume que solc.js se carga globalmente a través de angular.json.
declare var solc: any;

// Interfaces para una mejor estructura de datos (opcional pero recomendado)
interface SolcInputSource {
  content: string;
}

interface SolcInputSources {
  [contractName: string]: SolcInputSource;
}

interface SolcInput {
  language: 'Solidity';
  sources: SolcInputSources;
  settings: {
    outputSelection: {
      '*': {
        '*': string[]; // e.g., ['abi', 'evm.bytecode.object']
      };
    };
    optimizer?: {
        enabled: boolean;
        runs: number;
    };
  };
}

interface SolcOutputContract {
  abi: any[];
  evm: {
    bytecode: {
      object: string;
    };
  };
}

interface SolcOutputError {
    severity: string;
    formattedMessage: string;
    component: string;
    message: string;
    type: string;
}

interface SolcOutput {
  errors?: SolcOutputError[];
  contracts?: {
    [fileName: string]: {
      [contractName: string]: SolcOutputContract;
    };
  };
}

export interface CompilationResult {
  abi: any[];
  bytecode: string;
  contractName: string; // El nombre del contrato compilado
  warnings?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CompilerService {

  constructor() {
    if (typeof solc !== 'undefined' && solc.version) {
      console.log('CompilerService Constructor: Solc.js cargado. Versión:', solc.version());
    } else {
      console.error('CompilerService Constructor: Solc.js NO está cargado o no tiene el método version(). Verifica la carga del script global.');
      // Puedes intentar verificarlo después de un pequeño retraso, aunque no es ideal:
      setTimeout(() => {
        if (typeof solc !== 'undefined' && solc.version) {
          console.log('CompilerService Constructor (after delay): Solc.js cargado. Versión:', solc.version());
        } else {
          console.error('CompilerService Constructor (after delay): Solc.js SIGUE sin cargarse.');
        }
      }, 2000); // Espera 2 segundos
    }
  }

  async compile(fileName: string, sourceCode: string): Promise<CompilationResult> {
    if (typeof solc === 'undefined') {
      throw new Error('Solc-js no está cargado. No se puede compilar.');
    }

    console.log(`Compilando ${fileName}...`);

    const input: SolcInput = {
      language: 'Solidity',
      sources: {
        [fileName]: { // Usamos el nombre de archivo como clave para las fuentes
          content: sourceCode
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode.object'] // Solicitamos ABI y Bytecode
          }
        },
        optimizer: { // Opcional: optimizador
            enabled: true,
            runs: 200
        }
      }
    };

    // solc.compile espera una cadena JSON como entrada
    const outputJson = solc.compile(JSON.stringify(input));
    const output: SolcOutput = JSON.parse(outputJson);

    const errors = output.errors?.filter(err => err.severity === 'error') || [];
    const warnings = output.errors?.filter(err => err.severity === 'warning') || [];

    if (errors.length > 0) {
      const errorMessages = errors.map(err => err.formattedMessage).join('\n');
      console.error('Errores de compilación:\n', errorMessages);
      throw new Error(`Errores de compilación:\n${errorMessages}`);
    }

    const compilationWarnings = warnings.map(warn => warn.formattedMessage);
    if (compilationWarnings.length > 0) {
        console.warn('Advertencias de compilación:\n', compilationWarnings.join('\n'));
    }

    if (!output.contracts || !output.contracts[fileName]) {
      console.error('Output de compilación:', output);
      throw new Error('No se encontraron contratos compilados para el archivo proporcionado.');
    }

    const compiledContracts = output.contracts[fileName];
    const contractNames = Object.keys(compiledContracts);

    if (contractNames.length === 0) {
      throw new Error('El archivo .sol no contiene ningún contrato.');
    }

    // Asumimos que el contrato principal tiene el mismo nombre que el archivo (sin .sol)
    // o tomamos el primer contrato si hay varios.
    // Una UI más avanzada podría permitir al usuario seleccionar cuál compilar.
    const mainContractNameFromFile = fileName.replace(/\.sol$/i, '');
    let contractName = mainContractNameFromFile;
    if (!compiledContracts[contractName]) {
        // Si el nombre derivado del archivo no existe como contrato, toma el primero.
        console.warn(`Contrato "${contractName}" no encontrado, usando el primer contrato del archivo: ${contractNames[0]}`);
        contractName = contractNames[0];
    }


    const contract = compiledContracts[contractName];
    if (!contract) {
      throw new Error(`No se pudo encontrar la definición del contrato "${contractName}" en el archivo compilado.`);
    }

    const abi = contract.abi;
    const bytecode = contract.evm?.bytecode?.object;

    if (!abi || !bytecode) {
      throw new Error(`ABI o Bytecode no se generaron para el contrato "${contractName}".`);
    }

    console.log(`Compilación exitosa para el contrato: ${contractName}`);
    return {
      abi,
      bytecode: '0x' + bytecode, // El bytecode usualmente se usa con el prefijo 0x
      contractName: contractName,
      warnings: compilationWarnings.length > 0 ? compilationWarnings : undefined
    };
  }
}