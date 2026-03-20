import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";
import { widgetDataService } from "../src/modules/widgetData/widget-data.service";

const originalFindById = widgetsRepository.findById;
const mutableWidgetsRepository = widgetsRepository as unknown as {
  findById: (id: string) => Promise<{
    id: string;
    userId: string;
    type: string;
    config: Record<string, unknown>;
    position: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null>;
};

beforeEach(() => {
  mutableWidgetsRepository.findById = async () => {
    return {
      id: "widget-clock",
      userId: "user-1",
      type: "clockDate",
      config: {},
      position: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };
});

after(() => {
  mutableWidgetsRepository.findById =
    originalFindById as typeof mutableWidgetsRepository.findById;
});

test("widgetDataService returns normalized payload for clockDate widget", async () => {
  const result = await widgetDataService.getWidgetData("widget-clock");

  assert.ok(result);
  assert.equal(result.widgetKey, "clockDate");
  assert.equal(result.state, "ready");
  assert.ok(result.data);
  assert.equal(typeof result.data.formattedTime, "string");
  assert.equal(typeof result.data.formattedDate, "string");
});

test("widgetDataService returns empty state for placeholder weather widget", async () => {
  mutableWidgetsRepository.findById = async () => {
    return {
      id: "widget-weather",
      userId: "user-1",
      type: "weather",
      config: { location: "Amsterdam" },
      position: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  const result = await widgetDataService.getWidgetData("widget-weather");

  assert.ok(result);
  assert.equal(result.widgetKey, "weather");
  assert.equal(result.state, "empty");
  assert.equal(result.data, null);
});
