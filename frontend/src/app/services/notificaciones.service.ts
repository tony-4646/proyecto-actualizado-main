import { Injectable, EventEmitter } from '@angular/core';

//PARA ACTUALIZAR NOTIFICACIONES

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {
  notificacionCambio = new EventEmitter<void>();

  actualizarStock() {
    this.notificacionCambio.emit();
  }
}