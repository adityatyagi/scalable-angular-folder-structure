import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { ProjectLayoutComponent } from "./core/layouts/project-layout/project-layout.component";
import { ALL_ROUTES } from "./core/routes/all-routes";

const routes: Routes = [
  {
    path: "",
    component: ProjectLayoutComponent,
    children: ALL_ROUTES
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
