import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect, beforeEach, afterEach } from "vitest";
import { LocalDate } from "@js-joda/core";
import { Container } from "inversify";
import { ILogger } from "@hipponot/soa-logger";
import { BellScheduleGroup, prisma } from "@repo/db";
import {
  BellScheduleDayFactory,
  BellScheduleGroupFactory,
  BellScheduleVariantFactory,
  DayLabelRuleSetFactory,
  TimeSlotFactory,
  PatternBasedRuleFactory,
  VariantRuleSetFactory,
  ExceptionBasedRuleFactory,
  BellScheduleFactory,
} from "./builders/rbv.factories";
import { BellScheduleBuilder } from "./builders/rbv.builders";
import { RBVHelper } from "../rbv_helper";
import { BellScheduleDay, BellScheduleVariant, BellSchedule, DayLabelRuleSet, VariantRuleSet, MeetingTimes } from "../rbv.types";
import { DayLabelRecurrenceRuleType } from "@repo/db";
import { faker } from "@faker-js/faker";

const feature = await loadFeature("./src/sectors/rbv/__tests__/rbv-canonical-examples.feature");

const mockLogger: ILogger = {
  info: console.log,
  warn: console.log,
  error: console.log,
  debug: console.log,
};

describeFeature(feature, ({ Scenario, ScenarioOutline, Background, BeforeAllScenarios, AfterEachScenario }) => {
  let container: Container;
  let rbv_helper: RBVHelper;
  let schedule: BellSchedule;
  let builder: BellScheduleBuilder;

  BeforeAllScenarios(async () => {
    container = new Container();
    container.bind("ILogger").toConstantValue(mockLogger);
    container.bind<RBVHelper>("RBVHelper").to(RBVHelper);
    rbv_helper = container.get("RBVHelper");
  });

  AfterEachScenario(async () => {
    await prisma.bellSchedule.deleteMany();
  });

  Background(({ Given, And }) => {
    let schedule_id: string = faker.string.uuid();
    
    let groupings: BellScheduleGroup[] = [];
    Given("Bell Schedule Groupings:", (ctx, table: { name: string }[]) => {
      groupings = table.map( t => BellScheduleGroupFactory.build({ name: t.name, scheduleId: schedule_id }) );
    });

    let days: BellScheduleDay[] = [];
    And("Bell Schedule Days:", (ctx, table: { name: string, groups: string }[]) => {
      days = table.map(t => {
        return BellScheduleDayFactory.build({
          name: t.name,
          groups: t.groups.split(", ").map(g => groupings.find(grouping => grouping.name === g)!),
          scheduleId: schedule_id,
        });
      });
    });

    let variants: BellScheduleVariant[] = [];
    function addVariant(ctx, variant_name: string, table: { period: number, start: string, end: string }[]) {
      const variant = BellScheduleVariantFactory.build({
        name: variant_name,
        scheduleId: schedule_id,
        timeSlots: [],
      });
      variant.timeSlots = table.map(t => {
        return TimeSlotFactory.build({
          name: `${variant_name} ${t.period}`,
          start: t.start,
          end: t.end,
          variantId: variant.id,
        });
      });
      
      variants.push(variant);
    }
    And("a {string} variant with time slots:", addVariant);
    And("a second {string} variant with time slots:", addVariant);

    let dayRuleSet: DayLabelRuleSet;
    And("the days alternate between A Day and B Day", () => {
      dayRuleSet= DayLabelRuleSetFactory.build({
        scheduleId: schedule_id,
        type: DayLabelRecurrenceRuleType.PATTERN_BASED,
        dayOfWeekRules: undefined,
      });
      dayRuleSet.patternBasedRules = days.map((day, index) => {
        return PatternBasedRuleFactory.build({
          scheduleId: schedule_id,
          scheduleDayId: day.id,
          ruleSetId: dayRuleSet.id,
          patternPosition: index,
        });
      });
    });

    let activeDaysOfWeek: number[] = [];
    And("the active school days are Monday through Friday", (ctx, days: string) => {
      activeDaysOfWeek = [1, 2, 3, 4, 5];
    });

    And("the schedule begins on {string}", (ctx, startDate: string) => {
      dayRuleSet.seedDate = LocalDate.parse(startDate).toString();
    });

    let variantRuleSet: VariantRuleSet;
    And("the default variant is {string}", (ctx, variant: string) => {
      variantRuleSet = VariantRuleSetFactory.build({
        scheduleId: schedule_id,
        defaultVariantId: variants.find(v => v.name === variant)!.id,
        exceptions: [],
      });
    });

    And("there is a two-hour delay scheduled for {string}", (ctx, date: string) => {
      variantRuleSet.exceptions.push(ExceptionBasedRuleFactory.build({
        variantId: variants.find(v => v.name === "Two Hour Delay")!.id,
        variantRuleSetId: variantRuleSet.id,
        date: LocalDate.parse(date).toString(),
      }));
    });

    And("the schedule is created", () => {
      schedule = BellScheduleFactory.build({
        id: schedule_id,
        name: "Bladensburg",
        description: "Bladensburg schedule",
        activeDaysOfWeek,
        days,
        variants,
        groups: groupings,
        dayLabelRuleSet: dayRuleSet,
        variantRuleSet: variantRuleSet,
      });
    
      builder = new BellScheduleBuilder(rbv_helper, schedule, prisma);
    });
  });

  ScenarioOutline("Determine day type for specific dates", ({ Given, When, Then, And }, variables) => {
    let scheduledGroupIDs: string[] = [];

    Given("the Bladensburg schedule", async () => {
      await builder.build();
    });

    When("I request the day type for <Date>", async () => {
      const date = LocalDate.parse(variables.Date);
      const result = await rbv_helper.calculate_meeting_times({
        scheduleId: schedule.id,
        dateRange: {
          start: date,
          end: date,
        },
      });
      if (!result.success) {
        throw new Error("Failed to calculate meeting times");
      }
      scheduledGroupIDs = result.data.map(m => m.scheduleGroupId);
    });

    Then("the day type should be <Day Type>", () => {
      expect(scheduledGroupIDs.sort()).toEqual(schedule.days.find(d => d.name === variables["Day Type"])!.groups.map(g => g.id).sort());
    });

    And("the groups should be <Groups>", () => {
      expect(scheduledGroupIDs.sort()).toEqual(variables.Groups.split(", ").map(g => g.trim()).map(g => schedule.groups.find(group => group.name === g)!.id).sort());
    });
  });
});