import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

//METODOS PARA MOVIMIENTOS

@Component({
    selector: 'app-movimientos',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './movimientos.html',
    styleUrl: './movimientos.css'
})
export class Movimientos implements OnInit {
    movimientos: any[] = [];
    productos: any[] = [];
    lotes: any[] = [];
    porcentajeIva = 15;
    modalDetalleOpen = false;
    movimientoSeleccionado: any = null;

    modalOpen = false;
    tipoMovimiento: 'ENTRADA' | 'SALIDA' | 'PERDIDA' = 'ENTRADA';
    movimientoActual: any = {
        producto_id: null,
        cantidad: 1,
        observacion: '',
        nro_lote: '',
        fecha_vencimiento: '',
        costo_compra: 0
    };

    productoSeleccionado: any = null;
    resultado: any = null;
    loading = false;

    constructor(private api: ApiService, private cd: ChangeDetectorRef) { }

    ngOnInit() {
        this.cargarDatos();
        this.api.getConfiguracion().subscribe({
            next: (data) => {
                if (data && data.confiva_porcentaje) {
                    this.porcentajeIva = parseFloat(data.confiva_porcentaje);
                }
            },
            error: (err) => console.error('Error cargando configuración de IVA', err)
        });
    }

    cargarDatos() {
        this.loading = true;
        this.movimientos = [];

        this.api.getProductos().subscribe({
            next: (data) => {
                this.productos = data;
                this.cd.detectChanges();
            },
            error: (err) => console.error('Error cargando productos', err)
        });

        this.api.getMovimientos().subscribe({
            next: (data) => {
                this.movimientos = data;
                this.loading = false;
                this.cd.detectChanges();
            },
            error: (err) => {
                console.error('Error cargando movimientos', err);
                this.loading = false;
            }
        });
    }

    abrirModal(tipo: 'ENTRADA' | 'SALIDA' | 'PERDIDA') {
        this.tipoMovimiento = tipo;
        this.resultado = null;
        this.movimientoActual = {
            producto_id: null,
            cantidad: 1,
            observacion: '',
            nro_lote: '',
            fecha_vencimiento: '',
            costo_compra: 0
        };
        this.productoSeleccionado = null;
        this.modalOpen = true;
    }

    cerrarModal() {
        this.modalOpen = false;
        this.resultado = null;
    }

    onProductoChange() {
        if (this.movimientoActual.producto_id) {
            this.productoSeleccionado = this.productos.find(
                p => p.prodid == this.movimientoActual.producto_id
            );
            this.api.getLotes(this.movimientoActual.producto_id).subscribe({
                next: (data: any) => {
                    this.lotes = data.filter((l: any) => l.lotcantidad_actual > 0);
                },
                error: (err) => console.error('Error cargando lotes', err)
            });
        } else {
            this.productoSeleccionado = null;
            this.lotes = [];
        }
    }

    verDetalle(m: any) {
        console.log('Datos recibidos del servidor:', m);
        this.movimientoSeleccionado = m;
        this.modalDetalleOpen = true;
    }

    cerrarModalDetalle() {
        this.modalDetalleOpen = false;
        this.movimientoSeleccionado = null;
    }

    registrar() {
        if (!this.movimientoActual.producto_id || this.movimientoActual.cantidad < 1) {
            alert('Selecciona un producto y una cantidad válida (mínimo 1)');
            return;
        }

        const hoy = new Date().toISOString().split('T')[0];

        if (this.tipoMovimiento === 'ENTRADA') {
            if (!this.movimientoActual.nro_lote || this.movimientoActual.nro_lote.trim() === '') {
                alert('Ingrese el número de lote');
                return;
            }
            if (!this.movimientoActual.fecha_vencimiento) {
                alert('Ingrese la fecha de vencimiento');
                return;
            }
            if (this.movimientoActual.fecha_vencimiento <= hoy) {
                alert('La fecha de vencimiento no puede ser anterior o igual a hoy');
                return;
            }
            if (this.movimientoActual.costo_compra <= 0) {
                alert('Ingrese un costo de compra válido');
                return;
            }

            this.loading = true;
            const dataEntrada = {
                productos: [{
                    prodid: this.movimientoActual.producto_id,
                    cantidad: this.movimientoActual.cantidad,
                    costo_compra: this.movimientoActual.costo_compra,
                    nro_lote: this.movimientoActual.nro_lote,
                    fecha_vencimiento: this.movimientoActual.fecha_vencimiento
                }],
                observacion: this.movimientoActual.observacion
            };

            this.api.createEntrada(dataEntrada).subscribe({
                next: (res: any) => {
                    this.resultado = res;
                    this.loading = false;
                    alert('Compra registrada y stock actualizado');
                    this.cerrarModal();
                    this.cargarDatos();
                },
                error: (err: any) => {
                    alert('Error: ' + (err.error?.error || 'No se pudo registrar la entrada'));
                    this.loading = false;
                }
            });

        }

        else {
            if (!this.movimientoActual.lotid) {
                alert('Debe seleccionar el lote específico de donde sale el producto');
                return;
            }
            const loteSeleccionado = this.lotes.find(l => l.lotid == this.movimientoActual.lotid);

            if (!loteSeleccionado) {
                alert('El lote seleccionado no es válido');
                return;
            }

            if (this.movimientoActual.cantidad > loteSeleccionado.lotcantidad_actual) {
                alert(`Error, el lote seleccionado solo tiene ${loteSeleccionado.lotcantidad_actual} unidades disponibles.`);
                return;
            }

            this.loading = true;
            const isPerdida = this.tipoMovimiento === 'PERDIDA';

            const dataAjuste = {
                prodid: this.movimientoActual.producto_id,
                lotid: this.movimientoActual.lotid,
                cantidad: this.movimientoActual.cantidad, 
                observacion: this.movimientoActual.observacion || (isPerdida ? 'Pérdida / Desecho registrado' : 'Salida manual'),
                tipo_especifico: isPerdida ? 'PERDIDA_DESECHO' : 'VENTA'
            };

            this.api.registrarAjuste(dataAjuste).subscribe({
                next: (res: any) => {
                    this.resultado = res;
                    this.loading = false;
                    alert((isPerdida ? 'Pérdida registrada' : 'Salida realizada') + ' correctamente');
                    this.cerrarModal();
                    this.cargarDatos();
                },
                error: (err: any) => {
                    alert((err.error?.error || 'No hay stock suficiente o el lote es inválido'));
                    this.loading = false;
                }
            });
        }
    }

    getIVA(): number {
        if (!this.productoSeleccionado || this.tipoMovimiento === 'ENTRADA') return 0;
        if (!this.productoSeleccionado.prodtiene_iva) return 0;

        const subtotal = this.productoSeleccionado.prodprecio_venta * this.movimientoActual.cantidad;

        const factorIva = this.porcentajeIva / 100;
        return Math.round(subtotal * factorIva * 100) / 100;
    }

    getTotal(): number {
        if (!this.productoSeleccionado) return 0;
        if (this.tipoMovimiento === 'ENTRADA') {
            return Math.round(this.movimientoActual.costo_compra * this.movimientoActual.cantidad * 100) / 100;
        }
        const subtotal = this.productoSeleccionado.prodprecio_venta * this.movimientoActual.cantidad;
        return Math.round((subtotal + this.getIVA()) * 100) / 100;
    }

    getTipoBadgeClass(tipo: string): string {
        const map: Record<string, string> = {
            'COMPRA': 'badge-success',
            'VENTA': 'badge-info',
            'AJUSTE_ENTRADA': 'badge-warning',
            'AJUSTE_SALIDA': 'badge-danger',
            'DEVOLUCION': 'badge-secondary',
            'PERDIDA_DESECHO': 'badge-danger'
        };
        return map[tipo] || 'badge-info';
    }
}
