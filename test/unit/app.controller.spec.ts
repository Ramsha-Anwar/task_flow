/**
 * @fileoverview Unit test suite for AppController.
 * Verifies basic controller initialization and greeting endpoint output.
 *
 * @module test/unit/app.controller.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../../src/app.controller';
import { AppService } from '../../src/app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    /**
     * @test Verifies that getHello() returns the expected static greeting string.
     */
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
