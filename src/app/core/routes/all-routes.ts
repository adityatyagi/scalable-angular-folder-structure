import { Routes } from "@angular/router";

export const ALL_ROUTES: Routes = [
  {
    path: "",
    loadChildren: "./home/home.module#HomeModule"
  }
];
