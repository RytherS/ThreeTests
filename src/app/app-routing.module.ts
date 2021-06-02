import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ModelViewerComponent } from './model-viewer/model-viewer.component';

const routes: Routes = [
  { path: "model-viewer", component: ModelViewerComponent },
  { path: "", redirectTo: "model-viewer", pathMatch: "full" }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
