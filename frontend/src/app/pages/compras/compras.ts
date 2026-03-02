import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

//METODOS PARA COMPRAS

@Component({
    selector: 'app-compras',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './compras.html',
    styleUrls: ['./compras.css']
})
export class ComprasComponent implements OnInit {
    vistaActual: 'historial' | 'nueva' = 'historial';
    compras: any[] = [];
    loading = false;

    productos: any[] = [];
    busquedaProducto = '';
    productosFiltrados: any[] = [];

    items: any[] = [];
    observacion = '';
    porcentajeIva = 15;

    constructor(private api: ApiService, private auth: AuthService) { }

    ngOnInit() {
        this.cargarHistorial();
        this.api.getConfiguracion().subscribe(data => {
            if (data && data.confiva_porcentaje) {
                this.porcentajeIva = parseFloat(data.confiva_porcentaje);
            }
        });
    }

    cargarHistorial() {
        this.loading = true;
        this.api.getEntradas().subscribe({
            next: (data) => { this.compras = data; this.loading = false; },
            error: (err) => { console.error('Error:', err); this.loading = false; }
        });
    }

    iniciarNuevaCompra() {
        this.vistaActual = 'nueva';
        this.items = [];
        this.observacion = '';
        this.busquedaProducto = '';
        this.productosFiltrados = [];

        this.api.getProductos().subscribe(data => this.productos = data);
    }

    volverHistorial() {
        this.vistaActual = 'historial';
        this.cargarHistorial();
    }

    buscarProducto() {
        if (!this.busquedaProducto.trim()) { this.productosFiltrados = []; return; }
        const term = this.busquedaProducto.toLowerCase();
        this.productosFiltrados = this.productos.filter(p =>
            p.prodnombre.toLowerCase().includes(term) || p.prodcodigo.toLowerCase().includes(term)
        ).slice(0, 8);
    }

    agregarItem(producto: any) {
        const existente = this.items.find(i => i.prodid === producto.prodid);
        if (existente) {
            existente.cantidad++;
            return;
        }

        this.api.getProducto(producto.prodid).subscribe(detalle => {
            if (!detalle.proveedores || detalle.proveedores.length === 0) {
                alert(`El producto "${producto.prodnombre}" no tiene ningún proveedor asignado.\n\nPor favor, asigne un proveedor en el módulo de productos antes de comprar.`);
                return;
            }

            this.items.push({
                prodid: producto.prodid,
                prodnombre: producto.prodnombre,
                prodcodigo: producto.prodcodigo,
                cantidad: 1,
                costo_compra: detalle.proveedores[0].costo_referencia || 0,
                nro_lote: '',
                fecha_vencimiento: '',
                provid: detalle.proveedores[0].provid,
                proveedoresDisponibles: detalle.proveedores,
                dias_entrega: detalle.proveedores[0].dias_entrega || 'N/A'
            });
        });

        this.busquedaProducto = '';
        this.productosFiltrados = [];
    }

    quitarItem(index: number) {
        this.items.splice(index, 1);
    }

    get subtotalCompra(): number {
        return this.items.reduce((sum, item) => sum + (item.cantidad * item.costo_compra), 0);
    }

    get ivaCompra(): number {
        return this.subtotalCompra * (this.porcentajeIva / 100);
    }

    get totalCompra(): number {
        return this.subtotalCompra + this.ivaCompra;
    }

    procesarCompra() {
        if (this.items.length === 0) { alert('Agregue al menos un producto'); return; }

        const hoy = new Date().toISOString().split('T')[0];

        for (const item of this.items) {
            if (!item.nro_lote || item.nro_lote.trim() === '') {
                alert(`Debe ingresar un número de lote`);
                return;
            }
            if (!item.fecha_vencimiento) {
                alert(`Debe ingresar una fecha de vencimiento válida`);
                return;
            }
            if (item.fecha_vencimiento <= hoy) {
                alert(`No se puede comprar un lote vencido o que lo hará hoy`);
                return;
            }

            if (!item.provid) {
                alert(`Seleccione un proveedor antes de continuar`);
                return;
            }

            if (!item.cantidad || item.cantidad <= 0) {
                alert(`Ingrese una cantidad válida para este producto`);
                return;
            }
            if (!item.costo_compra || item.costo_compra <= 0) {
                alert(`Ingrese un costo válido para este producto`);
                return;
            }
        }

        if (!confirm(`¿Confirmar compra por $${this.totalCompra.toFixed(2)}?`)) return;

        this.loading = true;

        const data = {
            productos: this.items.map(item => ({
                prodid: item.prodid,
                cantidad: item.cantidad,
                costo_compra: item.costo_compra,
                nro_lote: item.nro_lote || null,
                fecha_vencimiento: item.fecha_vencimiento,
                provid: item.provid
            })),
            observacion: this.observacion,
            usuid: this.auth.usuario?.usuid || 1
        };

        this.api.createEntrada(data).subscribe({
            next: (res) => {
                alert(`Compra registrada exitosamente`);
                this.loading = false;
                this.volverHistorial();
            },
            error: (err) => {
                alert('Error al registrar compra: ' + (err.error?.error || err.message));
                this.loading = false;
            }
        });
    }

    onProveedorChange(item: any) {
        if (!item.provid) return;

        const provSeleccionado = item.proveedoresDisponibles.find((p: any) => p.provid == item.provid);

        if (provSeleccionado) {
            item.costo_compra = provSeleccionado.costo_referencia || 0;

            item.dias_entrega = provSeleccionado.dias_entrega || 'N/A';
        }
    }
}
