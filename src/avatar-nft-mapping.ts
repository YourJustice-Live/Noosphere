import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  ReputationChange,
  Transfer,
  URI
} from "../generated/AvatarNFT/AvatarNFT";
import {
  AvatarNftEntity,
  AvatarNftReputationEntity
} from "../generated/schema";

/**
 * Handle a tranfer event to create or update an Avatar NFT entity for the specified account.
 */
export function handleTransfer(event: Transfer): void {
  // Find or create entity
  let entity = AvatarNftEntity.load(event.params.tokenId.toString());
  if (!entity) {
    entity = new AvatarNftEntity(event.params.tokenId.toString());
  }
  // Update entity's params
  entity.owner = event.params.to;
  // Save entity
  entity.save();
}

/**
 * Handle a URI event to update a URI with metadata for the specified token.
 */
export function handleURI(event: URI): void {
  // Find entity and return if not found
  let entity = AvatarNftEntity.load(event.params.id.toString());
  if (!entity) {
    return;
  }
  // Update entity's params
  entity.uri = event.params.value.toString();
  entity.save();
}

/**
 * Handle a reputation change event to update reputation.
 */
export function handleReputationChange(event: ReputationChange): void {
  let entityId = `${event.params.id}_${event.params.domain}`;
  // Find or create entity
  let entity = AvatarNftReputationEntity.load(entityId);
  if (!entity) {
    log.info("[Dev] create entity", []);
    entity = new AvatarNftReputationEntity(entityId);
    entity.domain = event.params.domain;
    entity.token = event.params.id.toString();
    entity.negativeRating = BigInt.zero();
    entity.positiveRating = BigInt.zero();
  }
  // Update reputation entity's negative rating (rating=0)
  if (event.params.rating == 0) {
    entity.negativeRating = event.params.socre;
  }
  // Update reputation entity's positive rating (rating=1)
  if (event.params.rating == 1) {
    entity.positiveRating = event.params.socre;
  }
  // Save entity
  entity.save();
}
