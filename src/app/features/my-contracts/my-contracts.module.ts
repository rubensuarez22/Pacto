import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MyContractsRoutingModule } from './my-contracts-routing.module';
import { ContractsGridComponent } from './components/contracts-grid/contracts-grid.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { ContractCardComponent } from './components/contract-card/contract-card.component';
import { MyContractsComponent } from './components/my-contracts/my-contracts.component';
import { TitleComponent } from './components/title/title.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';


@NgModule({
  declarations: [
    ContractCardComponent,
    MyContractsComponent,
    TitleComponent,
    ToolbarComponent,
    ContractsGridComponent,
    EmptyStateComponent,
    ContractCardComponent
  ],
  imports: [
    CommonModule,
    MyContractsRoutingModule
  ],
  exports: [

    ContractCardComponent,
    MyContractsComponent,
    TitleComponent,
    ToolbarComponent,
    ContractsGridComponent,
    EmptyStateComponent,
    ContractCardComponent
  ]
})
export class MyContractsModule { }
