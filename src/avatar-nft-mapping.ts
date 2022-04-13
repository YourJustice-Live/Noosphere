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
  // Parse uri ipfs hash
  let uriIpfsHash = event.params.value.split("/").at(-1);
  // Load uri data
  let uriData = ipfs.cat(uriIpfsHash);
  // Parse uri json
  let uriJson = uriData ? json.fromBytes(uriData) : null;
  let uriJsonObject = uriJson ? uriJson.toObject() : null;
  // Get uri json image
  let uriJsonImage = uriJsonObject ? uriJsonObject.get("image") : null;
  let uriJsonImageString = uriJsonImage ? uriJsonImage.toString() : null;
  // Parse uri json attributes
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
 * Handle a reputation change event to update reputation.
 */
export function handleReputationChange(event: ReputationChange): void {
  let entityId = `${event.params.id}_${event.params.domain}`;
  // Find or create entity
  let entity = AvatarNftReputationEntity.load(entityId);
  if (!entity) {
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
