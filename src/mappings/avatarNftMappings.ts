import { BigInt, ipfs, json, JSONValue, JSONValueKind } from "@graphprotocol/graph-ts";
import { SoulType, Transfer, URI } from "../../generated/AvatarNFT/AvatarNFT";
import {
  AvatarNftEntity
} from "../../generated/schema";
import { addAvatarNftToAccountEntity } from "../utils";

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
  avatarNftEntity.idBigInt = event.params.tokenId;
  avatarNftEntity.owner = event.params.to.toHexString();
  avatarNftEntity.type = "";
  avatarNftEntity.totalNegativeRating = BigInt.zero();
  avatarNftEntity.totalPositiveRating = BigInt.zero();
  avatarNftEntity.totalNegativeCases = BigInt.zero();
  avatarNftEntity.totalPositiveCases = BigInt.zero();
  avatarNftEntity.save();
  // Update account entity
  addAvatarNftToAccountEntity(event.params.to, avatarNftEntity);
}

export function handleSoulType(event: SoulType): void {
  // Find entity and return if not found
  let entity = AvatarNftEntity.load(event.params.tokenId.toString());
  if (!entity) {
    return;
  }
  // Update avatar nft entity's params
  entity.type = event.params.soulType;
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
  let uriEmailString: string | null = null;
  let uriIsEmailNotificationsEnabled: boolean = false;
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
    // Check trait type for getting email
    if (
      uriAttributeTraitType &&
      uriAttributeTraitType.toString() == "Email"
    ) {
      uriEmailString = uriAttributeValue
        ? uriAttributeValue.toString()
        : null;
    }
    // Check trait type for getting is email notifications enabled
    if (
      uriAttributeTraitType &&
      uriAttributeTraitType.toString() == "Is Email Notifications Enabled"
    ) {
      uriIsEmailNotificationsEnabled = uriAttributeValue
        ? uriAttributeValue.kind == JSONValueKind.BOOL && uriAttributeValue.toBool()
        : false;
    }
  }
  // Update entity's params
  entity.uri = event.params.value;
  entity.uriData = uriData;
  entity.uriImage = uriJsonImageString;
  entity.uriFirstName = uriFirstNameString;
  entity.uriLastName = uriLastNameString;
  entity.uriEmail = uriEmailString;
  entity.uriIsEmailNotificationsEnabled = uriIsEmailNotificationsEnabled;
  entity.save();
}