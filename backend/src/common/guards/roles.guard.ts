import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/role.enum';
import { AuthenticatedUser } from '../types/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!requiredRoles.some(r => r.toLowerCase() === user.role?.toLowerCase())) {
      console.error(`[RolesGuard] Forbidden: User role '${user.role}' not in required roles:`, requiredRoles);
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
