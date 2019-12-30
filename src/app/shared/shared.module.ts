import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SampleSharedComponentComponent } from './components/sample-shared-component/sample-shared-component.component';
import { SampleDirectiveDirective } from './directives/sample-directive.directive';
import { SamplePipePipe } from './pipes/sample-pipe.pipe';

@NgModule({
  declarations: [SampleSharedComponentComponent, SampleDirectiveDirective, SamplePipePipe],
  imports: [
    CommonModule
  ]
})
export class SharedModule { }
