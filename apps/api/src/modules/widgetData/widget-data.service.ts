import { widgetsService } from "../widgets/widgets.service";
import type {
  WidgetDataByKey,
  WidgetDataEnvelope,
  WidgetKey,
} from "@ambient/shared-contracts";
import { widgetResolvers } from "./widget-resolvers";

type WidgetDataResult =
  WidgetDataEnvelope<WidgetDataByKey["clockDate"], "clockDate"> |
  WidgetDataEnvelope<WidgetDataByKey["weather"], "weather"> |
  WidgetDataEnvelope<WidgetDataByKey["calendar"], "calendar">;

export const widgetDataService = {
  async getWidgetData(widgetId: string): Promise<WidgetDataResult | null> {
    const widget = await widgetsService.getWidgetById(widgetId);

    if (!widget) {
      return null;
    }

    const resolver = widgetResolvers[widget.type as WidgetKey];
    if (!resolver) {
      return {
        widgetInstanceId: widget.id,
        widgetKey: widget.type as WidgetKey,
        state: "error",
        data: null,
        meta: {
          errorCode: "UNSUPPORTED_WIDGET_TYPE",
          message: `Unsupported widget type: ${widget.type}`,
        },
      } as WidgetDataResult;
    }

    return resolver({
      widgetInstanceId: widget.id,
      widgetConfig: widget.config,
    });
  },
};
