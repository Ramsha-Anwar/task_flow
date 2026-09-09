import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route with the workspace roles allowed to access it.
 * Read by WorkspaceRolesGuard to decide whether the current user's
 * membership role satisfies the route's requirements.
 * @param roles - One or more role names permitted to call this route (e.g. 'admin', 'member').
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);