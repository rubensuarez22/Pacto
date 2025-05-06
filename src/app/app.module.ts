import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SharedModule } from './shared/shared.module';
import { LandingModule } from './features/landing/landing.module';
import { CreateContractModule } from './features/create-contract/create-contract.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    SharedModule,
    LandingModule,
    CreateContractModule

  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
