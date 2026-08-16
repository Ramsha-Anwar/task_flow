import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './entity/board.entity';
import { ProjectService } from '../projects/project.service';

/**
 * Handles board creation and lookup, scoped to a parent project.
 */
@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Board)
    private boardRepository: Repository<Board>,
    private projectService: ProjectService,
  ) {}

  /**
   * Looks up a project by ID, throwing if it doesn't exist.
   * Used internally before creating or listing boards under it.
   * @param projectId - The parent project's UUID.
   * @returns The matching Project entity.
   * @throws {NotFoundException} If the project doesn't exist.
   */
  async findProjectById(projectId: string) {
    const project = await this.projectService.findProjectById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  /**
   * Looks up a single board by ID.
   * @param boardId - The board's UUID.
   * @returns The matching Board entity, or null if it doesn't exist.
   */
  async findBoardById(boardId: string): Promise<Board | null> {
    return this.boardRepository.findOne({ where: { id: boardId } });
  }

  /**
   * Lists all boards belonging to a given project.
   * @param projectId - The parent project's UUID.
   * @returns An array of Board entities.
   * @throws {NotFoundException} If the project doesn't exist.
   */
  async findBoardsByProjectId(projectId: string) {
    const project = await this.findProjectById(projectId);
    const boards = await this.boardRepository.find({ where: { project: { id: project.id } } });
    return boards;
  }

  /**
   * Creates a new board under a project.
   * @param name - The name of the new board.
   * @param projectId - The parent project's UUID.
   * @returns The newly created Board entity.
   * @throws {NotFoundException} If the project doesn't exist.
   */
  async createBoard(name: string, projectId: string) {
    const board = this.boardRepository.create({ name, project: await this.findProjectById(projectId) });
    return this.boardRepository.save(board);
  }
}