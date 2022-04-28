import { BigInt, ipfs, json, JSONValue } from "@graphprotocol/graph-ts";
import {
  ReputationChange,
  Transfer,
  URI
} from "../generated/AvatarNFT/AvatarNFT";
import {
  AvatarNftEntity,
  AvatarNftReputationEntity
} from "../generated/schema";
import { addAvatarNftToAccountEntity } from "./utils";

/**
 * Handle a tranfer event to create or update an Avatar NFT entity for the specified account.
 */
export function handleTransfer(event: Transfer): void {
  // Find or create avatar nft entity
  let avatarNftEntity = AvatarNftEntity.load(event.params.tokenId.toString());
  if (!avatarNftEntity) {
    avatarNftEntity = new AvatarNftEntity(event.params.tokenId.toString());
  }
  // Update avatar nft entity's params
  avatarNftEntity.owner = event.params.to.toHexString();
  avatarNftEntity.totalNegativeRating = BigInt.zero();
  avatarNftEntity.totalPositiveRating = BigInt.zero();
  avatarNftEntity.save();
  // Update account entity
  addAvatarNftToAccountEntity(event.params.to, avatarNftEntity);
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
  // Load uri data
  let uriIpfsHash = event.params.value.split("/").at(-1);
  let uriData = ipfs.cat(uriIpfsHash);
  // Parse uri json
  let uriJson = uriData ? json.fromBytes(uriData) : null;
  let uriJsonObject = uriJson ? uriJson.toObject() : null;
  // Get image from uri data
  let uriJsonImage = uriJsonObject ? uriJsonObject.get("image") : null;
  let uriJsonImageString = uriJsonImage ? uriJsonImage.toString() : null;
  // Get attributes from uri data
  let uriJsonAttributes = uriJsonObject
    ? uriJsonObject.get("attributes")
    : null;
  let uriJsonAttributesArray = uriJsonAttributes
    ? uriJsonAttributes.toArray()
    : new Array<JSONValue>(0);
  // Get uri first name and last name
  let uriFirstNameString: string | null = null;
  let uriLastNameString: string | null = null;
  for (let i = 0; i < uriJsonAttributesArray.length; i++) {
    // Get trait type and value
    let uriAttributeTraitType = uriJsonAttributesArray[i]
      .toObject()
      .get("trait_type");
    let uriAttributeValue = uriJsonAttributesArray[i].toObject().get("value");
    // Check trait type for getting first name
    if (
      uriAttributeTraitType &&
      uriAttributeTraitType.toString() == "First Name"
    ) {
      uriFirstNameString = uriAttributeValue
        ? uriAttributeValue.toString()
        : null;
    }
    // Check trait type for getting last name
    if (
      uriAttributeTraitType &&
      uriAttributeTraitType.toString() == "Last Name"
    ) {
      uriLastNameString = uriAttributeValue
        ? uriAttributeValue.toString()
        : null;
    }
  }
  // Update entity's params
  entity.uri = event.params.value;
  entity.uriData = uriData;
  entity.uriImage = uriJsonImageString;
  entity.uriFirstName = uriFirstNameString;
  entity.uriLastName = uriLastNameString;
  entity.save();
}

/**
 * Handle a reputation change event to update avatar reputation.
 */
export function handleReputationChange(event: ReputationChange): void {
  // Find avatar nft entity and return if not found
  let avatarNftEntity = AvatarNftEntity.load(event.params.id.toString());
  if (!avatarNftEntity) {
    return;
  }
  let reputationEntityId = `${event.params.id.toString()}_${event.params.domain.toString()}`;
  // Find or create reputation entity
  let reputationEntity = AvatarNftReputationEntity.load(reputationEntityId);
  if (!reputationEntity) {
    reputationEntity = new AvatarNftReputationEntity(reputationEntityId);
    reputationEntity.domain = event.params.domain;
    reputationEntity.token = event.params.id.toString();
    reputationEntity.negativeRating = BigInt.zero();
    reputationEntity.positiveRating = BigInt.zero();
  }
  // Update negative rating (rating=0)
  if (event.params.rating == 0) {
    avatarNftEntity.totalNegativeRating = avatarNftEntity.totalNegativeRating
      .minus(reputationEntity.negativeRating)
      .plus(event.params.socre);
    reputationEntity.negativeRating = event.params.socre;
  }
  // Update positive rating (rating=1)
  if (event.params.rating == 1) {
    avatarNftEntity.totalPositiveRating = avatarNftEntity.totalPositiveRating
      .minus(reputationEntity.positiveRating)
      .plus(event.params.socre);
    reputationEntity.positiveRating = event.params.socre;
  }
  // Save entities
  avatarNftEntity.save();
  reputationEntity.save();
}
