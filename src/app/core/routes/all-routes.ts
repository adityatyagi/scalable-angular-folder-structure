import { Routes } from '@angular/router';

export const ALL_ROUTES: Routes = [
  {
    path: '',
    loadChildren:
      './profile-comparison/profile-comparison.module#ProfileComparisonModule'
  }
];
