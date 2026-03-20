import { Prisma } from "@prisma/client";
import { widgetsRepository } from "./widgets.repository";

export const widgetsService = {
  getUserWidgets(userId: string) {
    return widgetsRepository.findAll(userId);
  },

  getWidgetById(id: string) {
    return widgetsRepository.findById(id);
  },

  createWidget(data: {
    userId: string;
    type: string;
    config: Prisma.InputJsonValue;
    position: number;
  }) {
    return widgetsRepository.create(data);
  }
};