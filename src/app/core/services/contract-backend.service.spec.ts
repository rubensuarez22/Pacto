import { TestBed } from '@angular/core/testing';

import { ContractBackendService } from './contract-backend.service';

describe('ContractBackendService', () => {
  let service: ContractBackendService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContractBackendService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
