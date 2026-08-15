import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './entity/board.entity';
import { ProjectService } from '../projects/project.service';

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Board)
    private boardRepository: Repository<Board>,
    private projectService: ProjectService,
  ) {}

  async findProjectById(projectId: string) {
    const project = await this.projectService.findProjectById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async findBoardById(boardId: string): Promise<Board | null> {
    return this.boardRepository.findOne({ where: { id: boardId } });
  }

  async findBoardsByProjectId(projectId: string) {
    const project = await this.findProjectById(projectId);
    const boards = await this.boardRepository.find({ where: { project: { id: project.id } } });
    return boards;
  }

  async createBoard(name: string, projectId: string) {
    const board = this.boardRepository.create({ name, project: await this.findProjectById(projectId) });
    return this.boardRepository.save(board);
  }
}