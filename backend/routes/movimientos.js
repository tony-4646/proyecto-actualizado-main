const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// OBTENER TODOS LOS MOVIMIENTOS O KARDEX GENERAL
router.get('/', async (req, res) => {
    try {
        const [movimientos] = await pool.query(`
            SELECT 
                k.*, 
                p.prodnombre, 
                p.prodcodigo, 
                u.usuusuario, 
                pr.provnombre,
                l.lotnro_lote  
            FROM kardex k
            JOIN productos p ON k.prodid = p.prodid
            LEFT JOIN usuarios u ON k.usuid = u.usuid
            LEFT JOIN proveedores pr ON k.provid = pr.provid 
            LEFT JOIN lotes l ON k.lotid = l.lotid 
            ORDER BY k.karfecha DESC
            LIMIT 100
        `);
        res.json(movimientos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// OBTENER EL KARDEX DE UN PRODUCTO
router.get('/kardex/:prodid', async (req, res) => {
    try {
        const [producto] = await pool.query(
            'SELECT prodid, prodcodigo, prodnombre, prodstock_global FROM productos WHERE prodid = ?',
            [req.params.prodid]
        );

        if (producto.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const [movimientos] = await pool.query(`
            SELECT k.*, u.usuusuario
            FROM kardex k
            LEFT JOIN usuarios u ON k.usuid = u.usuid
            WHERE k.prodid = ?
            ORDER BY k.karfecha ASC
        `, [req.params.prodid]);

        res.json({
            producto: producto[0],
            movimientos,
            saldo_actual: producto[0].prodstock_global
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AJUSTE DE INVENTARIO, REGISTRO DE PÉRDIDA O ENTRADA
router.post('/ajuste', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { prodid, lotid, cantidad, observacion, tipo_especifico } = req.body;
        const usuid = req.body.usuid || 1;

        const [producto] = await connection.query(
            'SELECT prodid, prodstock_global FROM productos WHERE prodid = ?', [prodid]
        );
        if (producto.length === 0) throw new Error('Producto no encontrado');

        const esEntrada = ['AJUSTE_ENTRADA', 'DEVOLUCION'].includes(tipo_especifico);
        const esSalida = ['AJUSTE_SALIDA', 'CADUCIDAD', 'PERDIDA_DESECHO', 'VENTA'].includes(tipo_especifico);

        if (!esEntrada && !esSalida) {
            throw new Error('Tipo de movimiento no válido para un ajuste');
        }

        if (!lotid) {
            throw new Error('Debe seleccionar un lote para realizar cualquier ajuste de inventario.');
        }

        const [lote] = await connection.query(
            'SELECT lotid, lotcantidad_actual, provid FROM lotes WHERE lotid = ? AND prodid = ?',
            [lotid, prodid]
        );

        if (lote.length === 0) throw new Error('El lote seleccionado no existe o no pertenece a este producto');

        if (esSalida && lote[0].lotcantidad_actual < cantidad) {
            throw new Error(`Stock insuficiente en el lote. Disponible: ${lote[0].lotcantidad_actual}, Requerido: ${cantidad}`);
        }

        const sqlUpdateLote = esEntrada
            ? 'UPDATE lotes SET lotcantidad_actual = lotcantidad_actual + ? WHERE lotid = ?'
            : 'UPDATE lotes SET lotcantidad_actual = lotcantidad_actual - ? WHERE lotid = ?';

        await connection.query(sqlUpdateLote, [cantidad, lotid]);

        const saldoAnteriorGlobal = producto[0].prodstock_global;
        const saldoNuevoGlobal = esEntrada
            ? saldoAnteriorGlobal + cantidad
            : saldoAnteriorGlobal - cantidad;

        await connection.query(`
            INSERT INTO kardex (
                prodid, lotid, kartipo, karcantidad, karsaldo_anterior, 
                karsaldo_actual, karref_documento, karobservacion, usuid, provid
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            prodid,
            lotid,
            tipo_especifico,
            cantidad,
            saldoAnteriorGlobal,
            saldoNuevoGlobal,
            'AJUSTE',
            observacion || `Ajuste de tipo ${tipo_especifico}`,
            usuid,
            lote[0].provid
        ]);

        await connection.commit();
        res.json({
            mensaje: 'Ajuste registrado exitosamente',
            stock_global_nuevo: saldoNuevoGlobal,
            tipo: tipo_especifico
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error en ajuste:', error.message);
        res.status(400).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// REPORTE DE MOVIMIENTOS POR FECHA Y TIPO
router.get('/reporte', async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, tipo } = req.query;

        let query = `
            SELECT k.*, p.prodnombre, p.prodcodigo
            FROM kardex k
            JOIN productos p ON k.prodid = p.prodid
            WHERE 1=1
        `;
        const params = [];

        if (fecha_inicio) {
            query += ' AND DATE(k.karfecha) >= ?';
            params.push(fecha_inicio);
        }
        if (fecha_fin) {
            query += ' AND DATE(k.karfecha) <= ?';
            params.push(fecha_fin);
        }
        if (tipo) {
            query += ' AND k.kartipo = ?';
            params.push(tipo);
        }

        query += ' ORDER BY k.karfecha DESC';

        const [movimientos] = await pool.query(query, params);

        const totales = movimientos.reduce((acc, mov) => {
            if (['COMPRA', 'AJUSTE_ENTRADA', 'DEVOLUCION'].includes(mov.kartipo)) {
                acc.total_entradas += mov.karcantidad;
            } else {
                acc.total_salidas += mov.karcantidad;
            }
            return acc;
        }, { total_entradas: 0, total_salidas: 0 });

        res.json({ movimientos, totales });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
