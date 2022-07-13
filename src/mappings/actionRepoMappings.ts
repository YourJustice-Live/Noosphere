import { ipfs } from "@graphprotocol/graph-ts";
import {
  ActionAdded,
  ActionURI
} from "../../generated/ActionRepo/ActionRepo";
import { ActionEntity } from "../../generated/schema";

/**
 * Handle a action added event to create an action entity.
 */
export function handleActionAdded(event: ActionAdded): void {
  // Skip if entity exists
  if (ActionEntity.load(event.params.id.toString())) {
    return;
  }
  // Create entity
  let entity = new ActionEntity(event.params.guid.toHexString());
  entity.subject = event.params.subject;
  entity.verb = event.params.verb;
  entity.object = event.params.object;
  entity.tool = event.params.tool;
  entity.save();
}

/**
 * Handle a action uri event to update an action entity.
 */
export function handleActionURI(event: ActionURI): void {
  // Find entity and return if not found
  let entity = ActionEntity.load(event.params.guid.toHexString());
  if (!entity) {
    return;
  }
  // Load uri data
  let uriIpfsHash = event.params.uri.split("/").at(-1);
  let uriData = ipfs.cat(uriIpfsHash);
  // Update entity's params
  entity.uri = event.params.uri;
  entity.uriData = uriData;
  entity.save();
}