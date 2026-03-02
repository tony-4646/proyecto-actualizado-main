import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

//MÉTODOS PARA USUARIO

@Component({
    selector: 'app-usuarios',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './usuarios.html',
    styleUrls: ['./usuarios.css']
})
export class UsuariosComponent implements OnInit {
    usuarios: any[] = [];
    roles: any[] = [];
    loading = false;

    modalOpen = false;
    editando = false;
    usuarioActual: any = this.nuevoUsuario();

    modalPasswordOpen = false;
    passwordUsuarioId: number | null = null;
    passwordUsuarioNombre = '';
    contrasenaActual = '';
    nuevaContrasena = '';
    confirmarContrasena = '';

    get rolesFiltrados(): any[] {
        if (this.editando && this.usuarioActual.usuid === 1) {
            return this.roles.filter(r => r.rolid === 1);
        }
        return this.roles.filter(r => r.rolnombre !== 'Administrador');
    }
    menuOpen = false;


    constructor(private api: ApiService, public auth: AuthService) { }


    ngOnInit() {
        this.cargarDatos();
    }

    toggleMenu() {
        this.menuOpen = !this.menuOpen;
    }

    nuevoUsuario() {
        return {
            usuid: null,
            usuusuario: '',
            contrasena: '',
            rolid: null
        };
    }

    cargarDatos() {
        this.loading = true;

        this.api.getUsuarios().subscribe({
            next: (data: any[]) => {
                const usuarioLogueado = this.auth.usuario;

                if (this.auth.rolNombre === 'Administrador') {
                    this.usuarios = data;
                } else {
                    this.usuarios = data.filter((u: any) => u.usuid === usuarioLogueado?.usuid);
                }
                this.loading = false;
            },
            error: (err) => {
                console.error('Error cargando usuarios:', err);
                this.loading = false;
            }
        });

        this.api.getRoles().subscribe({
            next: (data) => this.roles = data,
            error: (err) => console.error('Error cargando roles:', err)
        });
    }

    getRolNombre(rolid: number): string {
        const rol = this.roles.find(r => r.rolid === rolid);
        return rol ? rol.rolnombre : '-';
    }


    getRolClass(rolnombre: string): string {
        switch (rolnombre) {
            case 'Administrador': return 'badge-admin';
            case 'Cajero': return 'badge-cajero';
            case 'Bodeguero': return 'badge-bodeguero';
            default: return '';
        }
    }

    abrirModal(usuario?: any) {
        if (usuario) {
            this.editando = true;
            this.usuarioActual = {
                usuid: usuario.usuid,
                usuusuario: usuario.usuusuario,
                contrasena: '',
                rolid: usuario.rolid
            };
        } else {
            this.editando = false;
            this.usuarioActual = this.nuevoUsuario();
            this.usuarioActual.rolid = 2;
        }
        this.modalOpen = true;
    }

    cerrarModal() {
        this.modalOpen = false;
        this.usuarioActual = this.nuevoUsuario();
    }



    guardar() {
    const esAdmin = this.auth.rolNombre === 'Administrador';
    const usuarioLogueado = this.auth.usuario;

    if (!this.usuarioActual.usuusuario || !this.usuarioActual.rolid) {
        alert('Complete los campos obligatorios');
        return;
    }

    if (this.editando) {
        const original = this.usuarios.find(u => u.usuid === this.usuarioActual.usuid);
        
        if (!esAdmin) {
            if (original && this.usuarioActual.rolid !== original.rolid) {
                alert('No tienes permisos para cambiar tu rol');
                this.usuarioActual.rolid = original.rolid;
                return;
            }
            if (!this.usuarioActual.contrasena) {
                alert('Debe ingresar su contraseña actual para confirmar los cambios');
                return;
            }
        } 
        
        if (esAdmin && this.usuarioActual.usuid === usuarioLogueado?.usuid) {
            if (original && original.usuusuario !== this.usuarioActual.usuusuario) {
                if (!this.usuarioActual.contrasena) {
                    alert('Por seguridad, confirme su contraseña para cambiar su nombre de administrador');
                    return;
                }
            }
        }

        if (this.usuarioActual.usuid === 1 && this.usuarioActual.rolid !== 1) {
            alert('El Administrador principal no puede cambiar su rol');
            this.usuarioActual.rolid = 1;
            return;
        }

        this.api.updateUsuario(this.usuarioActual.usuid, {
            rolid: this.usuarioActual.rolid,
            usuario: this.usuarioActual.usuusuario,
            confirmacion: this.usuarioActual.contrasena ? this.usuarioActual.contrasena : null
        }).subscribe({
            next: () => {
                alert('Usuario actualizado exitosamente');
                this.cargarDatos();
                this.cerrarModal();
            },
            error: (err) => alert('Error: ' + (err.error?.error || err.message))
        });

    } else {
        if (!esAdmin) return;
        if (this.usuarioActual.rolid === 1) {
            alert('No se permite crear más cuentas de nivel Administrador');
            return;
        }
        if (!this.usuarioActual.contrasena) {
            alert('La contraseña es obligatoria para nuevos usuarios');
            return;
        }
        this.api.createUsuario({
            rolid: this.usuarioActual.rolid,
            usuario: this.usuarioActual.usuusuario,
            contrasena: this.usuarioActual.contrasena
        }).subscribe({
            next: () => {
                alert('Usuario creado exitosamente');
                this.cargarDatos();
                this.cerrarModal();
            },
            error: (err) => alert('Error: ' + (err.error?.error || err.message))
        });
    }
}

    abrirModalPassword(usuario: any) {
        this.passwordUsuarioId = usuario.usuid;
        this.passwordUsuarioNombre = usuario.usuusuario;
        this.nuevaContrasena = '';
        this.confirmarContrasena = '';
        this.modalPasswordOpen = true;
    }

    cerrarModalPassword() {
        this.modalPasswordOpen = false;
        this.passwordUsuarioId = null;
        this.contrasenaActual = '';
        this.nuevaContrasena = '';
        this.confirmarContrasena = '';
    }

    cambiarContrasena() {
        if (!this.contrasenaActual) {
            alert('Ingrese la contraseña actual para confirmar');
            return;
        }
        if (!this.nuevaContrasena) {
            alert('Ingrese la nueva contraseña');
            return;
        }
        if (this.nuevaContrasena !== this.confirmarContrasena) {
            alert('Las contraseñas no coinciden');
            return;
        }
        if (this.nuevaContrasena.length < 5) {
            alert('La contraseña debe tener al menos 5 caracteres');
            return;
        }

        this.api.cambiarContrasena(this.passwordUsuarioId!, this.nuevaContrasena, this.contrasenaActual).subscribe({
            next: () => {
                alert('Contraseña actualizada exitosamente');
                this.cerrarModalPassword();
            },
            error: (err) => alert('Error: ' + (err.error?.error || err.message))
        });
    }

    eliminar(usuario: any) {
        if (usuario.usuid === 1) {
            alert('No se puede eliminar al administrador principal');
            return;
        }
        if (confirm(`¿Eliminar al usuario "${usuario.usuusuario}"?`)) {
            this.api.deleteUsuario(usuario.usuid).subscribe({
                next: () => {
                    alert('Usuario eliminado');
                    this.cargarDatos();
                },
                error: (err) => alert('Error: ' + (err.error?.error || err.message))
            });
        }
    }
}
