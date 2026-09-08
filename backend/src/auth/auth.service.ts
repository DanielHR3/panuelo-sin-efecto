import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { verifyPassword } from '../common/hashing';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly jwt: JwtService,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<{ access_token: string; usuario: AuthUser }> {
    const usuario = await this.usuarios.findByEmailWithHash(dto.email);
    // Mismo mensaje para email inexistente y contraseña incorrecta: no filtra
    // qué emails están registrados.
    if (!usuario || !verifyPassword(dto.password, usuario.passwordHash)) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: AuthUser = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };
    return {
      access_token: await this.jwt.signAsync(payload),
      usuario: payload,
    };
  }
}
