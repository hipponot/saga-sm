-- CreateIndex
CREATE INDEX "idx_bell_schedule_day_schedule_id" ON "public"."BellScheduleDay"("scheduleId");

-- CreateIndex
CREATE INDEX "idx_bell_schedule_day_schedule_name" ON "public"."BellScheduleDay"("scheduleId", "name");

-- CreateIndex
CREATE INDEX "idx_bell_schedule_group_schedule_id" ON "public"."BellScheduleGroup"("scheduleId");

-- CreateIndex
CREATE INDEX "idx_bell_schedule_variant_schedule_id" ON "public"."BellScheduleVariant"("scheduleId");

-- CreateIndex
CREATE INDEX "idx_bell_schedule_variant_schedule_name" ON "public"."BellScheduleVariant"("scheduleId", "name");

-- CreateIndex
CREATE INDEX "idx_day_of_week_rule_rule_set_id" ON "public"."DayOfWeekRule"("ruleSetId");

-- CreateIndex
CREATE INDEX "idx_day_of_week_rule_rule_set_day" ON "public"."DayOfWeekRule"("ruleSetId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "idx_exception_rule_rule_set_id" ON "public"."ExceptionBasedRule"("variantRuleSetId");

-- CreateIndex
CREATE INDEX "idx_exception_rule_rule_set_date" ON "public"."ExceptionBasedRule"("variantRuleSetId", "date");

-- CreateIndex
CREATE INDEX "idx_pattern_rule_rule_set_id" ON "public"."PatternBasedRule"("ruleSetId");

-- CreateIndex
CREATE INDEX "idx_pattern_rule_rule_set_position" ON "public"."PatternBasedRule"("ruleSetId", "patternPosition");

-- CreateIndex
CREATE INDEX "idx_time_slot_variant_id" ON "public"."TimeSlot"("variantId");

-- CreateIndex
CREATE INDEX "idx_time_slot_variant_start" ON "public"."TimeSlot"("variantId", "start");
