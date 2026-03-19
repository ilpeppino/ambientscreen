import { widgetsRepository } from "./widgets.repository";

export const widgetsService = {
  getUserWidgets(userId: string) {
    return widgetsRepository.findAll(userId);
  },

  createWidget(data: {
    userId: string;
    type: string;
    config: any;
    position: number;
  }) {
    return widgetsRepository.create(data);
  }
};