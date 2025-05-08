import { TestBed } from '@angular/core/testing';

import { ContractInteractionService } from './contract-interaction.service';

describe('ContractInteractionService', () => {
  let service: ContractInteractionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContractInteractionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
