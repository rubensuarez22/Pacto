import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideFunctions, getFunctions } from '@angular/fire/functions';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SharedModule } from './shared/shared.module';
import { LandingModule } from './features/landing/landing.module';
import { CreateContractModule } from './features/create-contract/create-contract.module';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    SharedModule,
    LandingModule,
    CreateContractModule,
    HttpClientModule
  ],
  providers: [
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)), // Inicializa Firebase
    provideFirestore(() => getFirestore()),                     // Habilita Firestore
    provideFunctions(() => getFunctions())
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
