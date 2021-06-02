import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModelViewerComponent } from './model-viewer.component';
import { ThreeModule } from '../three/three.module';

@NgModule({
  declarations: [
    ModelViewerComponent
  ],
  imports: [
    CommonModule,
    ThreeModule
  ],
  exports: [
    ModelViewerComponent
  ]
})
export class ModelViewerModule { }
