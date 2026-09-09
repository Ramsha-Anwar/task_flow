import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Columns } from './entity/column.entity';
import { BoardModule } from '../board/board.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { ColumnService } from './column.service';
import { ColumnController } from './column.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Columns]),
    BoardModule,
    WorkspaceModule,
  ],
  providers: [ColumnService],
  controllers: [ColumnController],
})
export class ColumnModule {}