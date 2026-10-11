import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Clerk injects org_id in the JWT if the user is acting on behalf of an org
    // We allow user_id as a fallback to support Personal Workspaces for users without an org.
    const orgId = user.org_id || user.orgId || user.sub || user.id; 
    
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }

    // Attach organizationId to request for easy access in controllers
    request['organizationId'] = orgId;

    return true;
  }
}
