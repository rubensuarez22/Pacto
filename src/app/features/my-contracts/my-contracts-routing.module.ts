import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MyContractsComponent } from './components/my-contracts/my-contracts.component';
const routes: Routes = [
  { path: '', component: MyContractsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MyContractsRoutingModule { }
