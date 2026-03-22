interface EditModeSelectionState {
  editMode: boolean;
  selectedWidgetId: string | null;
}

export function toggleEditModeState(state: EditModeSelectionState): EditModeSelectionState {
  if (state.editMode) {
    return {
      editMode: false,
      selectedWidgetId: null,
    };
  }

  return {
    ...state,
    editMode: true,
  };
}

export function selectWidgetInEditMode(
  state: EditModeSelectionState,
  widgetId: string,
): EditModeSelectionState {
  if (!state.editMode) {
    return state;
  }

  return {
    ...state,
    selectedWidgetId: widgetId,
  };
}

export function clearEditModeSelection(state: EditModeSelectionState): EditModeSelectionState {
  return {
    ...state,
    selectedWidgetId: null,
  };
}

export function shouldShowGridOverlay(editMode: boolean): boolean {
  return editMode;
}

export function shouldShowEditModeHint(
  editMode: boolean,
  selectedWidgetId: string | null,
): boolean {
  return editMode && !selectedWidgetId;
}

export function shouldShowWidgetAffordances(
  editMode: boolean,
  isSelected: boolean,
): boolean {
  return editMode && isSelected;
}
