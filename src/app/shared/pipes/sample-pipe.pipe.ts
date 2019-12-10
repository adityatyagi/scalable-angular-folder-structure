import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'samplePipe'
})
export class SamplePipePipe implements PipeTransform {

  transform(value: any, args?: any): any {
    return null;
  }

}
