import { ActionAdded } from "../generated/ActionRepo/ActionRepo";
import { ActionEntity } from "../generated/schema";

/**
 * TODO:
 *
 * 1. Handle the event "ActionURI".
 * 2. Handle the event "Confirmation".
 */

/**
 * Handle a action added event to create an action entity.
 */
export function handleActionAdded(event: ActionAdded): void {
  // Skip if entity exists
  if (ActionEntity.load(event.params.id.toString())) {
    return;
  }
  // Create entity
  let entity = new ActionEntity(event.params.id.toString());
  entity.guid = event.params.guid;
  entity.subject = event.params.subject;
  entity.verb = event.params.verb;
  entity.object = event.params.object;
  entity.tool = event.params.tool;
  entity.affected = event.params.affected;
  entity.save();
}