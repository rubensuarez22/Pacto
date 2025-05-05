import { Routes } from "@angular/router";


export const routes: Routes = [
    {
        path: '',
        loadChildren: () =>
            import('./features/landing/landing.module').then(m => m.LandingModule)
    },
    {
        path: '**',
        redirectTo: ''
    }
];