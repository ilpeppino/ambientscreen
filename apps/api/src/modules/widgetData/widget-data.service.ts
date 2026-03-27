import { widgetsService } from "../widgets/widgets.service";
import type {
  WidgetDataByKey,
  WidgetDataEnvelope,
  WidgetKey,
} from "@ambient/shared-contracts";
import {
  normalizeWidgetConfig,
  validateWidgetConfig,
  type SupportedWidgetType,
} from "../widgets/widget-contracts";
import { getWidgetPlugin } from "../widgets/widgetPluginRegistry";

type WidgetDataResult =
  WidgetDataEnvelope<WidgetDataByKey[WidgetKey], WidgetKey>;

export const widgetDataService = {
  async getWidgetDataForUser(widgetId: string, userId: string): Promise<WidgetDataResult | null> {
    const widget = await widgetsService.getWidgetByIdForUser(widgetId, userId);

    if (!widget) {
      return null;
    }

    const widgetType = widget.type as SupportedWidgetType;
    const plugin = getWidgetPlugin(widgetType);
    if (!plugin?.api?.resolveData) {
      return {
        widgetInstanceId: widget.id,
        widgetKey: widgetType,
        state: "error",
        data: null,
        meta: {
          errorCode: "UNSUPPORTED_WIDGET_TYPE",
          message: `Unsupported widget type: ${widget.type}`,
        },
      };
    }

    const validationResult = validateWidgetConfig(widgetType, widget.config);
    if (!validationResult.success) {
      return {
        widgetInstanceId: widget.id,
        widgetKey: widgetType,
        state: "error",
        data: null,
        meta: {
          errorCode: "INVALID_WIDGET_CONFIG",
          message: `Invalid config for widget type: ${widget.type}`,
        },
      };
    }

    try {
      return await plugin.api.resolveData({
        widgetInstanceId: widget.id,
        widgetKey: widgetType,
        widgetConfig: normalizeWidgetConfig(widgetType, widget.config),
        userId,
      });
    } catch {
      return {
        widgetInstanceId: widget.id,
        widgetKey: widgetType,
        state: "error",
        data: null,
        meta: {
          errorCode: "RESOLVER_FAILURE",
          message: "Widget data resolver encountered an unexpected error",
        },
      };
    }
  },
};
