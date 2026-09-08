import { AuthUser } from './decorators/current-user.decorator';

// Añade `request.user` (payload del JWT) al tipo Request de Express.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
