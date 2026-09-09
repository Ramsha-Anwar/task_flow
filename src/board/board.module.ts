import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from './entity/board.entity';
import { ProjectModule } from '../projects/project.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { BoardService } from './board.service';
import { BoardController } from './board.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Board]),
    ProjectModule,
    WorkspaceModule,
  ],
  providers: [BoardService],
  controllers: [BoardController],
  exports: [BoardService],
})
export class BoardModule {}