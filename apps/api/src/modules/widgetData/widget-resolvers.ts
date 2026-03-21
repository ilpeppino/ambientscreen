import type {
  WidgetDataByKey,
  WidgetDataEnvelope,
  WidgetKey,
} from "@ambient/shared-contracts";
import { resolveCalendarWidgetData } from "./resolvers/calendar.resolver";
import { resolveClockDateWidgetData } from "./resolvers/clockDate.resolver";
import { resolveWeatherWidgetData } from "./resolvers/weather.resolver";

export type WidgetResolver<TKey extends WidgetKey> = (input: {
  widgetInstanceId: string;
  widgetConfig: unknown;
}) => Promise<WidgetDataEnvelope<WidgetDataByKey[TKey], TKey>>;

export const widgetResolvers: {
  [TKey in WidgetKey]: WidgetResolver<TKey>;
} = {
  clockDate: resolveClockDateWidgetData,
  weather: resolveWeatherWidgetData,
  calendar: resolveCalendarWidgetData,
};
