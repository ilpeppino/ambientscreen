import { calendarWidgetPlugin } from "./plugins/calendar.plugin";
import { clockDateWidgetPlugin } from "./plugins/clockDate.plugin";
import { weatherWidgetPlugin } from "./plugins/weather.plugin";
import { registerWidgetPlugin } from "./pluginRegistry";

let registered = false;

export function registerBuiltinWidgetPlugins() {
  if (registered) {
    return;
  }

  registerWidgetPlugin(clockDateWidgetPlugin);
  registerWidgetPlugin(weatherWidgetPlugin);
  registerWidgetPlugin(calendarWidgetPlugin);

  registered = true;
}

export function resetBuiltinWidgetPluginRegistrationForTests() {
  registered = false;
}
