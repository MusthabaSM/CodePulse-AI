import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles defined, meaning it's either public or only requires auth/tenant
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by ClerkAuthGuard

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // If there is no orgRole, this is a Personal Workspace (user using their own ID as orgId).
    // In a personal workspace, the user is implicitly the admin.
    if (!user.orgRole && !user.org_role) {
      return true; // Bypass role check for personal workspaces
    }

    const orgRole = user.orgRole || user.org_role;

    // Clerk roles are typically 'org:admin', 'org:member', etc. 
    // We map 'org:admin' -> 'admin', 'org:manager' -> 'manager', 'org:viewer' -> 'viewer' or 'org:member' -> 'viewer'
    // This depends on how Clerk is configured. Let's assume standard Clerk role strings.
    const clerkRole = orgRole.replace('org:', ''); // e.g., 'admin', 'member'

    // We can map clerk defaults to our system
    let systemRole: Role = 'viewer';
    if (clerkRole === 'admin') systemRole = 'admin';
    if (clerkRole === 'manager' || clerkRole === 'member') systemRole = 'manager'; // treating member as manager for simplicity

    const hasRole = requiredRoles.includes(systemRole) || systemRole === 'admin'; // Admin can do everything

    if (!hasRole) {
      throw new ForbiddenException(`Requires one of roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
