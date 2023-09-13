import { last } from "lodash";

import type { PlacedPlanItem } from "../../../../types";
import { toSpliced } from "../../../../util/to-spliced";
import { Edit, EditMode } from "../types";

export function transform(
  baseline: PlacedPlanItem[],
  cursorTime: number,
  { taskId, mode }: Edit,
) {
  const editTarget = baseline.find((task) => task.id === taskId);

  switch (mode) {
    case EditMode.DRAG:
      return drag(baseline, editTarget, cursorTime);
    case EditMode.DRAG_AND_SHIFT_OTHERS:
      return dragAndShiftOthers(baseline, editTarget, cursorTime);
    default:
      throw new Error(`Unknown edit mode: ${mode}`);
  }
}

function drag(
  baseline: PlacedPlanItem[],
  editTarget: PlacedPlanItem,
  cursorTime: number,
): PlacedPlanItem[] {
  const index = baseline.findIndex((task) => task.id === editTarget.id);

  const startMinutes = cursorTime;
  const endMinutes = cursorTime + editTarget.durationMinutes;

  const updated = {
    ...editTarget,
    startMinutes,
    endMinutes,
  };

  return toSpliced(baseline, index, updated);
}

function dragAndShiftOthers(
  baseline: PlacedPlanItem[],
  editTarget: PlacedPlanItem,
  cursorTime: number,
): PlacedPlanItem[] {
  const index = baseline.findIndex((task) => task.id === editTarget.id);
  const preceding = baseline.slice(0, index);
  const following = baseline.slice(index + 1);

  const newStartMinutes = cursorTime;
  const newEndMinutes = cursorTime + editTarget.durationMinutes;

  const updated = {
    ...editTarget,
    startMinutes: newStartMinutes,
    endMinutes: newEndMinutes,
  };

  const updatedFollowing = following.reduce((result, current) => {
    const previous = last(result) || updated;

    if (previous.endMinutes > current.startMinutes) {
      return [
        ...result,
        {
          ...current,
          startMinutes: previous.endMinutes,
          endMinutes: previous.endMinutes + current.durationMinutes,
        },
      ];
    }

    return [...result, current];
  }, []);

  const updatedPreceding = preceding
    .reverse()
    .reduce((result, current) => {
      const nextInTimeline = last(result) || updated;

      if (nextInTimeline.startMinutes < current.endMinutes) {
        return [
          ...result,
          {
            ...current,
            startMinutes: nextInTimeline.startMinutes - current.durationMinutes,
            endMinutes: nextInTimeline.startMinutes,
          },
        ];
      }

      return [...result, current];
    }, [])
    .reverse();

  return [...updatedPreceding, updated, ...updatedFollowing];
}
