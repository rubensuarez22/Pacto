import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CreateContractRoutingModule } from './create-contract-routing.module';
import { TitleComponent } from './components/title/title.component';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { FormComponent } from './components/form/form.component';
import { CreateContractComponent } from './components/create-contract/create-contract.component';
import { SharedModule } from '../../shared/shared.module';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    TitleComponent,
    FileUploadComponent,
    FormComponent,
    CreateContractComponent
  ],
  imports: [
    CommonModule,
    CreateContractRoutingModule,
    SharedModule,
    FormsModule
  ]
})
export class CreateContractModule { }
