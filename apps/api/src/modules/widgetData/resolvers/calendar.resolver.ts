import type {
  CalendarWidgetData,
  WidgetDataEnvelope,
} from "@ambient/shared-contracts";

export async function resolveCalendarWidgetData(input: {
  widgetInstanceId: string;
  widgetConfig: unknown;
}): Promise<WidgetDataEnvelope<CalendarWidgetData, "calendar">> {
  return {
    widgetInstanceId: input.widgetInstanceId,
    widgetKey: "calendar",
    state: "empty",
    data: null,
    meta: {
      message: "Calendar provider not configured yet.",
    },
  };
}
