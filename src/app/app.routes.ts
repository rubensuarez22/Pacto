import { Routes } from "@angular/router";


export const routes: Routes = [
    {
        path: '',
        loadChildren: () =>
            import('./features/landing/landing.module').then(m => m.LandingModule)
    },
    {
        path: 'create',
        loadChildren: () =>
            import('./features/create-contract/create-contract.module').then(m => m.CreateContractModule)
    },
    {
        path: '**',
        redirectTo: ''
    }
];