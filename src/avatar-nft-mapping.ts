import { Transfer, URI } from "../generated/AvatarNFT/AvatarNFT";
import { AvatarNftEntity } from "../generated/schema";

/**
 * Handle a tranfer event to create or update an Avatar NFT entity for the specified account.
 */
export function handleTransfer(event: Transfer): void {
  let entity = AvatarNftEntity.load(event.params.tokenId.toString());
  if (!entity) {
    entity = new AvatarNftEntity(event.params.tokenId.toString());
  }
  entity.owner = event.params.to;
  entity.save();
}

/**
 * Handle a URI event to update a URI with metadata for the specified token.
 */
export function handleURI(event: URI): void {
  let entity = AvatarNftEntity.load(event.params.id.toString());
  if (!entity) {
    return;
  }
  entity.uri = event.params.value.toString();
  entity.save();
}
