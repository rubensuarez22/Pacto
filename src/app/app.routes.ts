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
        path: 'my-contracts',
        loadChildren: () =>
            import('./features/my-contracts/my-contracts.module').then(m => m.MyContractsModule)
    },
    {
        path: '**',
        redirectTo: ''
    }
];