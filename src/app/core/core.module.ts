import { NgModule, SkipSelf, Optional } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";

import { ProjectLayoutComponent } from "./layouts/project-layout/project-layout.component";
import { NotFound404Component } from "./components/not-found404/not-found404.component";
import { UtilityService } from "./utilities/utility.service";
import { BaseService } from "./services/base.service";
import { EnsureModuleLoadedOnceGuard } from "./guards/ensure-module-loaded-once.guard";
import { HeaderComponent } from "./components/header/header.component";
import { FooterComponent } from "./components/footer/footer.component";

@NgModule({
  declarations: [
    ProjectLayoutComponent,
    NotFound404Component,
    HeaderComponent,
    FooterComponent
  ],
  imports: [CommonModule, HttpClientModule],
  exports: [HttpClientModule],
  providers: [BaseService, UtilityService]
})
export class CoreModule extends EnsureModuleLoadedOnceGuard {
  // Looks for the module in the parent injector to see if it's already been loaded (only want it loaded once)
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    super(parentModule);
  }
}
