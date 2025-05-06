import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CreateContractComponent } from './components/create-contract/create-contract.component';

const routes: Routes = [
  { path: '', component: CreateContractComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CreateContractRoutingModule { }
