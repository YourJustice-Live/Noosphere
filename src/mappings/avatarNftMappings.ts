import { BigInt, ipfs, json, JSONValue } from "@graphprotocol/graph-ts";
import { Transfer, URI } from "../../generated/AvatarNFT/AvatarNFT";
import {
  AvatarNftEntity
} from "../../generated/schema";
import { AVATAR_NFT_CONTRACT } from "../constants";
import { addAvatarNftToAccountEntity } from "../utils";

/**
 * Handle a tranfer event to create or update an Avatar NFT entity for the specified account.
 */
export function handleTransfer(event: Transfer): void {
  // Skip if owner is avatar nft contract
  // TODO: Delete when bug "89ada" will be fixed
  if (event.params.to.toHexString() == AVATAR_NFT_CONTRACT) {
    return;
  }
  // Find or create avatar nft entity
  let avatarNftEntity = AvatarNftEntity.load(event.params.tokenId.toString());
  if (!avatarNftEntity) {
    avatarNftEntity = new AvatarNftEntity(event.params.tokenId.toString());
  }
  // Update avatar nft entity's params
  avatarNftEntity.idBigInt = event.params.tokenId;
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