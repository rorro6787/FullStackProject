import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { Usuario } from "../entities/usuario";
import { SECRET_JWT } from "../config/config";
import { from } from "rxjs";
import * as jose from 'jose';
import { FRONTEND_URI } from "../config/config";
import { Sesion } from "../entities/sesion";
import { Plan } from "../entities/sesion";

// Este servicio imita al backend pero utiliza localStorage para almacenar los datos

const usuariosC: Usuario [] = [
  {
    id: 1,
    nombre: 'Admin',
    apellido1: 'Admin',
    apellido2: 'Admin',
    email: 'admin@uma.es',
    administrador: true,
    password: 'admin'
  },
  {
    id: 2,
    nombre: 'Antonio',
    apellido1: 'García',
    apellido2: 'Ramos',
    email: 'antonio@uma.es',
    administrador: false,
    password: '5678'
  },
];


const Sesiones: Sesion[] = [
    {
      idPlan: 0,
      inicio: new Date(),
      fin: new Date(),
      trabajoRealizado: "jugué a las palas en la playa",
      multimedia: ["https://www.youtube.com/shorts/-Tj9Ka6CEJw", "https://www.youtube.com/watch?v=xrUVWk5shXo"],
      decripcion: "soy muy malo y enano",
      presencial: true,
      datosSalud: ["tengo asma"],
      id: 0
    },
    {
      idPlan: 0,
      inicio: new Date(),
      fin: new Date(),
      trabajoRealizado: "dominó con papi",
      multimedia: ["https://www.youtube.com/watch?v=xrUVWk5shXo"],
      decripcion: "hamuc",
      presencial: true,
      datosSalud: ["ujaja"],
      id: 1
    },
    {
      idPlan: 1,
      inicio: new Date(),
      fin: new Date(),
      trabajoRealizado: "haciendo press de banca con 500kg",
      multimedia: ["https://www.youtube.com/watch?v=iu5G37fyyAg"],
      decripcion: "trembo",
      presencial: true,
      datosSalud: ["zoyfuerte"],
      id: 0
    },
  ]

  const Planes: Plan[] = [ 
    {
      planId: 0,
      sesiones: [Sesiones[0], Sesiones[1]]
    }, 
    {
      planId: 1,
      sesiones: [Sesiones[2]]
    }
  ]
  

@Injectable({
  providedIn: 'root'
})
export class BackendFakeService {
  private usuarios: Usuario [];
  private forgottenPasswordTokens;
  private planes: Plan[];

  constructor() {
    let _usuarios = localStorage.getItem('usuarios');
    if (_usuarios) {
      this.usuarios = JSON.parse(_usuarios);
    } else {
      this.usuarios = [...usuariosC];
    }

    let _forgottenPasswordTokens = localStorage.getItem('forgottenPasswordTokens');
    if (_forgottenPasswordTokens) {
      this.forgottenPasswordTokens = new Map(JSON.parse(_forgottenPasswordTokens));
    } else {
      this.forgottenPasswordTokens = new Map();
    }
    
    localStorage.removeItem('planes');
    let _planes = localStorage.getItem('planes');
    if (_planes) {
      this.planes = JSON.parse(_planes);
      this.guardarPlanesEnLocalStorage();
    } else {
      this.planes = [...Planes];
      this.guardarPlanesEnLocalStorage();
    }
  }

  getUsuarios(): Observable<Usuario[]> {
    return of(this.usuarios);
  }

  getPlanes(): Observable<Plan[]> {
    console.log(this.planes);
    return of(this.planes);
  }

  getSesionesPlan(idPlan: Number): Observable<Sesion[]> {
    const sesionesEnPlanes1: Sesion[] = [];

    // Iterar sobre cada plan
    for (const plan of this.planes) {
        // Verificar si el plan tiene el idPlan deseado
        if (plan.sesiones && plan.sesiones.length > 0 && plan.sesiones[0].idPlan === idPlan) {
            // Agregar las sesiones de este plan al arreglo de sesiones si coincide con el idPlan deseado
            sesionesEnPlanes1.push(...plan.sesiones);
        }
    }

    return of(sesionesEnPlanes1);

  }

  postUsuario(usuario: Usuario): Observable<Usuario> {
    let u = this.usuarios.find(u => u.email == usuario.email);
    if (!usuario.email) {
      return new Observable<Usuario>(observer => {
        observer.error('El email es obligatorio');
      });
    }
    if (u) {
      return new Observable<Usuario>(observer => {
        observer.error('El usuario ya existe');
      });
    }
    // Si no trae contraseña generamos una aleatoria
    if (usuario.password.length == 0) {
      usuario.password = this.generarCadena();
    }

    usuario.id = this.usuarios.map(u => u.id).reduce((a, b) => Math.max(a, b)) + 1;
    this.usuarios.push(usuario);
    this.guardarUsuariosEnLocalStorage();
    return of(usuario);
  }

  private guardarUsuariosEnLocalStorage() {
    localStorage.setItem('usuarios', JSON.stringify(this.usuarios));
  }

  private guardarPlanesEnLocalStorage() {
    localStorage.removeItem('planes');
    localStorage.setItem('planes', JSON.stringify(this.planes));
  }

  private guardarForgottenPasswordTokensEnLocalStorage() {
    localStorage.setItem('forgottenPasswordTokens', JSON.stringify(Array.from(this.forgottenPasswordTokens.entries())));
  }

  putUsuario(usuario: Usuario): Observable<Usuario> {
    let u = this.usuarios.find(u => u.id == usuario.id);
    if (!u) {
      return new Observable<Usuario>(observer => {
        observer.error('El usuario no existe');
      });
    }
    // Si la contraseña está en blanco mantenemos la que ya tiene
    if (usuario.password.length == 0) {
      usuario.password = u.password;
    }

    Object.assign(u, usuario);
    this.guardarUsuariosEnLocalStorage();
    return of(u);
  }

  deleteUsuario(id: number): Observable<void> {
    let i = this.usuarios.findIndex(u => u.id == id);
    if (i < 0) {
      return new Observable<void>(observer => {
        observer.error('El usuario no existe');
      });
    }
    this.usuarios.splice(i, 1);
    this.guardarUsuariosEnLocalStorage();
    return of();
  }

  getUsuario(id: number): Observable<Usuario> {
    let u = this.usuarios.find(u => u.id == id);
    if (!u) {
      return new Observable<Usuario>(observer => {
        observer.error('El usuario no existe');
      });
    }
    return of(u);
  }

  login(email: string, password: string): Observable<string> {
    let u = this.usuarios.find(u => u.email == email && u.password == password);
    if (!u) {
      return new Observable<string>(observer => {
        observer.error({status: 401, statusText: 'Usuario o contraseña incorrectos'});
      });
    }
    return from(this.generateJwt(u));
  }

  forgottenPassword(email: string): Observable<void> {
    const token = this.generarCadena()
    console.log('Para resetar la contraseña acceda a: '+FRONTEND_URI+'/reset-password?token='+token);
    this.forgottenPasswordTokens.set(token, email);
    this.guardarForgottenPasswordTokensEnLocalStorage();
    return of();
  }

  resetPassword(token: string, password: string): Observable<void> {
    if (!this.forgottenPasswordTokens.get(token)) {
      return new Observable<void>(observer => {
        observer.error('Token incorrecto');
      });
    }
    let email = this.forgottenPasswordTokens.get(token);
    console.log("Email for token: ", email)
    let u = this.usuarios.find(u => u.email == email);
    if (!u) {
      return new Observable<void>(observer => {
        observer.error('Usuario no existe');
      });
    }
    u.password = password;
    this.forgottenPasswordTokens.delete(token);

    this.guardarUsuariosEnLocalStorage();
    this.guardarForgottenPasswordTokensEnLocalStorage();
    return of();
  }

  private generateJwt(usuario: Usuario): Promise<string> {
    const secret = new TextEncoder().encode(SECRET_JWT);
    return new jose.SignJWT({ sub: ""+usuario.id, email: usuario.email })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);
  }

  private generarCadena(): string {
    return Math.random().toString(36).substring(2);
  }

}
