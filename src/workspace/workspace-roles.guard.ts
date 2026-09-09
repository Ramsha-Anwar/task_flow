import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceMember } from './entity/workspace-member.entity';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Route guard that checks whether the logged-in user is a member of the
 * workspace in the URL, and whether their role matches one of the roles
 * required by the route (set via the @Roles() decorator).
 * Gives a distinct rejection reason for "not a member" vs "wrong role".
 */
@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(WorkspaceMember)
    private workspaceMemberRepository: Repository<WorkspaceMember>,
  ) {}

  /**
   * Determines whether the current request is allowed to proceed.
   * @param context - The execution context for the incoming request.
   * @returns true if the user is a member with a permitted role.
   * @throws {BadRequestException} If the workspaceId is malformed.
   * @throws {ForbiddenException} If the user isn't a member of this workspace.
   * @throws {ForbiddenException} If the user's role isn't one of the required roles.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return false; 
    }

    const request = context.switchToHttp().getRequest();
    const workspaceId = request.params.workspaceId; 
    const userId = request.user.id;

    if (workspaceId && !UUID_REGEX.test(workspaceId)) {
      throw new BadRequestException('Validation failed (uuid is expected)');
    }

    const membership = await this.workspaceMemberRepository.findOne({
      where: { workspace: { id: workspaceId }, user: { id: userId } },
    });

    if (!membership) {
       throw new ForbiddenException('User is not a member of this workspace');
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}