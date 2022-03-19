import { Transfer, URI } from "../generated/AvatarNFT/AvatarNFT";
import { AvatarNftEntity } from "../generated/schema";

export function handleTransfer(event: Transfer): void {
  let entity = AvatarNftEntity.load(event.params.tokenId.toString());
  if (!entity) {
    // console.warn("[Dev] Entity not found: " + event.params.tokenId.toString());
    entity = new AvatarNftEntity(event.params.tokenId.toString());
    entity.owner = event.params.to;
  } else {
    // console.warn("[Dev] Entity found: " + event.params.tokenId.toString());
  }
  entity.owner = event.params.to;
  entity.save();
}

export function handleUri(event: URI): void {
  let entity = AvatarNftEntity.load(event.params.id.toString());
  if (!entity) {
    return;
  }
  entity.tokenUri = event.params.value.toString();
  entity.save();
}
