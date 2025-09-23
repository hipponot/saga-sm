import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BellScheduleFactory } from "./rbv.factories";
import { BellScheduleBuilder } from "./rbv.builders";
import { prisma } from "@repo/db";
import { RBVHelper } from "../../rbv_helper";
import { Container } from "inversify";
import { ILogger } from "@hipponot/soa-logger";

const mockLogger: ILogger = {
  info: console.log,
  warn: console.log,
  error: console.log,
  debug: console.log,
};

describe("RBVHelper", () => {
  let container: Container;
  let rbv_helper: RBVHelper;

  beforeEach(async () => {
    // Clean up database FIRST before creating container
    // This ensures no transactions are in progress
    await prisma.bellSchedule.deleteMany();

    container = new Container();
    container.bind("ILogger").toConstantValue(mockLogger);
    container.bind<RBVHelper>("RBVHelper").to(RBVHelper);
    rbv_helper = container.get("RBVHelper");
  });

  afterEach(async () => {
    // Clean up database after each test
    await prisma.bellSchedule.deleteMany();
  });

  describe("BellScheduleBuilder", () => {
    it("builds a bell schedule from factory data", async () => {
      // ARRANGE
      // Ensure clean state before test
      await prisma.bellSchedule.deleteMany();

      const schedule = BellScheduleFactory.build();
      const builder = new BellScheduleBuilder(rbv_helper, schedule, prisma);

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
    });
  });
});
