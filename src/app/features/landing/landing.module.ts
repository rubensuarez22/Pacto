import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingComponent } from './landing/landing.component';
import { HeroComponent } from './components/hero/hero.component';
import { CtaComponent } from './components/cta/cta.component';
import { HowItWorksComponent } from './components/how-it-works/how-it-works.component';
import { LandingRoutingModule } from './landing-routing.module';



@NgModule({
  declarations: [
    LandingComponent,
    HeroComponent,
    CtaComponent,
    HowItWorksComponent
  ],
  imports: [
    CommonModule,
    LandingRoutingModule
  ],
  exports: [
    LandingComponent
  ]
})
export class LandingModule { }
