import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreeComponent } from "./three.component"


@NgModule({
  declarations: [
    ThreeComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    ThreeComponent
  ]
})
export class ThreeModule { }
