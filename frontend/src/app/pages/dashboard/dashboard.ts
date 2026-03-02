import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

// METODOS PARA DASHBOARD

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
    productos: any[] = [];
    stockBajo: any[] = [];
    proximosVencer: any[] = [];
    caducados: any[] = []; 
    movimientosRecientes: any[] = [];
    ventasHoy = 0;

    resumen = {
        totalProductos: 0,
        valorInventario: 0,
        alertasStock: 0,
        proximosVencerCount: 0, 
        caducadosCount: 0      
    };

    loading = true;
    apiStatus = 'Verificando...';

    constructor(private api: ApiService) { }

    ngOnInit() {
        this.cargarDatos();
        this.verificarAPI();
        this.cargarVentasHoy();
    }

    async verificarAPI() {
        this.api.checkHealth().subscribe({
            next: (res) => {
                this.apiStatus = res.database === 'Connected' ? 'Conectado' : 'Desconectado';
            },
            error: () => {
                this.apiStatus = 'API no disponible';
            }
        });
    }

cargarVentasHoy() {
    this.api.getMovimientos().subscribe({
        next: (movimientos) => {
            const hoy = new Date().toISOString().split('T')[0];

            const ventasKardexHoy = movimientos.filter((m: any) => 
                m.kartipo === 'VENTA' && 
                m.karfecha && m.karfecha.startsWith(hoy)
            );

            this.ventasHoy = ventasKardexHoy.length;
        },
        error: (err) => {
            console.error('Error al sincronizar ventas desde Kardex:', err);
            this.ventasHoy = 0;
        }
    });
}

    cargarDatos() {
        this.loading = true;
        this.api.getDashboard().subscribe({
            next: (data) => {
                this.resumen = {
                    totalProductos: data.totalProductos,
                    valorInventario: data.valorInventario,
                    alertasStock: data.alertasStockBajo,
                    proximosVencerCount: data.productosProximosVencer,
                    caducadosCount: data.productosCaducados 
                };

                this.stockBajo = data.stockBajoLista;
                this.proximosVencer = data.proximosVencerLista;
                this.caducados = data.caducadosLista; 

                const entradas = data.ultimasEntradas.map((e: any) => ({
                    tipo: 'ENTRADA',
                    fecha: e.fecha,
                    detalle: `Compra: ${e.prodnombre}`, 
                    total: e.total || 0
                }));

                const salidas = data.ultimasSalidas.map((s: any) => ({
                    tipo: 'SALIDA',
                    fecha: s.fecha,
                    detalle: `Venta ${s.numero} - ${s.clinombre}`,
                    total: s.total || 0
                }));

                this.movimientosRecientes = [...entradas, ...salidas]
                    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                    .slice(0, 5);

                this.loading = false;
            },
            error: (err) => {
                console.error('Error cargando dashboard:', err);
                this.loading = false;
            }
        });
    }
}