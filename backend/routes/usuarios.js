const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// OBTENER TODOS LOS USUARIOS
router.get('/', async (req, res) => {
    try {
        const [usuarios] = await pool.query(`
            SELECT u.usuid, u.usuusuario, u.usuactivo, u.usucreacion, 
                   u.rolid, r.rolnombre
            FROM usuarios u
            JOIN roles r ON u.rolid = r.rolid
            WHERE u.usuactivo = 1
            ORDER BY u.usuusuario
        `);
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// OBTENER UN USUARIO
router.get('/:id', async (req, res) => {
    try {
        const [usuario] = await pool.query(`
            SELECT u.usuid, u.usuusuario, u.usuactivo, u.rolid, r.rolnombre
            FROM usuarios u
            JOIN roles r ON u.rolid = r.rolid
            WHERE u.usuid = ?
        `, [req.params.id]);

        if (usuario.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(usuario[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CREAR USUARIO Y HASHEAR CONTRASEÑA
router.post('/', async (req, res) => {
    try {
        const { rolid, usuario, contrasena } = req.body;

        const [result] = await pool.query(`
            INSERT INTO usuarios (rolid, usuusuario, usucontrasena)
            VALUES (?, ?, SHA2(?, 256))
        `, [rolid, usuario, contrasena]);

        res.status(201).json({
            mensaje: 'Usuario creado exitosamente',
            usuid: result.insertId
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }
        res.status(500).json({ error: error.message });
    }
});

// LOGIN AL SISTEMA
router.post('/login', async (req, res) => {
    try {
        const { usuario, contrasena } = req.body;

        const [result] = await pool.query(`
            SELECT u.usuid, u.usuusuario, u.rolid, r.rolnombre
            FROM usuarios u
            JOIN roles r ON u.rolid = r.rolid
            WHERE u.usuusuario = ? 
              AND u.usucontrasena = SHA2(?, 256)
              AND u.usuactivo = 1
        `, [usuario, contrasena]);

        if (result.length === 0) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        res.json({
            mensaje: 'Login exitoso',
            usuario: result[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ACTUALIZAR USUARIO
router.put('/:id', async (req, res) => {
    try {
        const { rolid, usuario, confirmacion } = req.body; 
        const { id } = req.params;

        if (confirmacion) {
            const [check] = await pool.query(`
                SELECT usuid FROM usuarios 
                WHERE usuid = ? AND usucontrasena = SHA2(?, 256)
            `, [id, confirmacion]);

            if (check.length === 0) {
                return res.status(401).json({ error: 'La contraseña de confirmación es incorrecta' });
            }
        }

        await pool.query(`
            UPDATE usuarios SET rolid = ?, usuusuario = ?
            WHERE usuid = ?
        `, [rolid, usuario, id]);

        res.json({ mensaje: 'Usuario actualizado exitosamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
        }
        res.status(500).json({ error: error.message });
    }
});

// CAMBIAR CONTRASEÑA
router.put('/:id/password', async (req, res) => {
    try {
        const { contrasena, contrasenaActual } = req.body;

        if (!contrasena) {
            return res.status(400).json({ error: 'La nueva contraseña es obligatoria' });
        }

        if (contrasenaActual) {
            const [check] = await pool.query(`
                SELECT usuid FROM usuarios 
                WHERE usuid = ? AND usucontrasena = SHA2(?, 256)
            `, [req.params.id, contrasenaActual]);

            if (check.length === 0) {
                return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
            }
        }

        await pool.query(`
            UPDATE usuarios SET usucontrasena = SHA2(?, 256) WHERE usuid = ?
        `, [contrasena, req.params.id]);

        res.json({ mensaje: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ELIMINAR SOFT DELETE USUARIO
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('UPDATE usuarios SET usuactivo = 0 WHERE usuid = ?', [req.params.id]);
        res.json({ mensaje: 'Usuario eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
