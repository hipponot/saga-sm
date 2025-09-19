import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest'
import {
  BellScheduleFactory,
} from './rbv.factories';
import { BellScheduleBuilder } from './rbv.builders';
import { prisma } from '@repo/db';
import { RBVHelper } from '../../rbv_helper';
import { Container } from 'inversify';
import { ILogger } from '@hipponot/soa-logger';

const mockLogger: ILogger = {
  info: console.log,
  warn: console.log,
  error: console.log,
  debug: console.log,
}

describe('RBVHelper', () => {
  let container: Container
  let rbv_helper: RBVHelper

  beforeEach(async () => {
    container = new Container()
    container.bind('ILogger').toConstantValue(mockLogger)
    container.bind<RBVHelper>('RBVHelper').to(RBVHelper)
    rbv_helper = container.get('RBVHelper')
  })

  describe('BellScheduleBuilder', () => {
    it('builds a bell schedule from factory data', async () => {
      // ARRANGE
      const schedule = BellScheduleFactory.build();
      const builder = new BellScheduleBuilder(rbv_helper, schedule, prisma)

      // ACT
      const builtSchedule = await builder.build();
      const fetched_schedule = await rbv_helper.get_schedule(schedule.id);
      if (!fetched_schedule.success) {
        throw new Error(fetched_schedule.message);
      }

      // ASSERT
      expect(fetched_schedule.data).toEqual(builtSchedule);
      expect({
        ...builtSchedule,
        days: builtSchedule.days.sort((a, b) => a.name.localeCompare(b.name)),
      }).toEqual({
        ...schedule,
        days: schedule.days.sort((a, b) => a.name.localeCompare(b.name)),
      });
    })
  })
})