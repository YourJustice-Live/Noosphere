import { BigInt, ipfs } from "@graphprotocol/graph-ts";
import {
  AvatarNftEntity,
  AvatarNftReputationEntity,
  CaseEntity,
  JurisdictionRoleEntity
} from "../../generated/schema";
import { Case as CaseTemplate } from "../../generated/templates";
import {
  Case as CaseContract,
  ContractURI
} from "../../generated/templates/Jurisdiction/Case";
import {
  OpinionChange, ReactionCreated, TransferByToken
} from "../../generated/templates/Jurisdiction/Jurisdiction";
import {
  addJurisdictionToAvatarNftEntity,
  getJurisdictionEntity, removeJurisdctionFromAvatarEntity,
  updateJurisdictionEntityRoles
} from "../utils";

/**
 * Handle a contract uri event to update jurisdiction uri data.
 */
export function handleContractUri(event: ContractURI): void {
  // Get jurisdiction
  let jurisdictionEntity = getJurisdictionEntity(event.address.toHexString());
  // Load uri data
  let uriIpfsHash = event.params.param0.split("/").at(-1);
  let uriData = ipfs.cat(uriIpfsHash);
  // Update jurisdiction
  jurisdictionEntity.uri = event.params.param0;
  jurisdictionEntity.uriData = uriData;
  jurisdictionEntity.save();
}

/**
 * Handle a tranfer by token event to create or update jurisdiction roles.
 */
export function handleTransferByToken(event: TransferByToken): void {
  // Get jurisdiction
  let jurisdictionEntity = getJurisdictionEntity(event.address.toHexString());
  // Define transfer type
  let isTokenMinted = event.params.fromOwnerToken.equals(BigInt.zero());
  let isTokenBurned = event.params.toOwnerToken.equals(BigInt.zero());
  if (isTokenMinted || isTokenBurned) {
    // Find or create jurisdiction role entity
    let jurisdictionRoleEntityId = `${event.address.toHexString()}_${event.params.id.toString()}`;
    let jurisdictionRoleEntity = JurisdictionRoleEntity.load(
      jurisdictionRoleEntityId
    );
    if (!jurisdictionRoleEntity) {
      jurisdictionRoleEntity = new JurisdictionRoleEntity(
        jurisdictionRoleEntityId
      );
      jurisdictionRoleEntity.jurisdiction = jurisdictionEntity.id;
      jurisdictionRoleEntity.roleId = event.params.id;
      jurisdictionRoleEntity.participants = [];
      jurisdictionRoleEntity.participantsCount = 0;
    }
    // Update participants in jurisdiction role entity
    let participants = jurisdictionRoleEntity.participants;
    let participantsCount = jurisdictionRoleEntity.participantsCount;
    if (isTokenMinted) {
      participants.push(event.params.toOwnerToken.toString());
      participantsCount = participantsCount + 1;
    }
    if (isTokenBurned) {
      const accountIndex = participants.indexOf(event.params.fromOwnerToken.toString());
      if (accountIndex > -1) {
        participants.splice(accountIndex, 1);
      }
      participantsCount = participantsCount - 1;
    }
    // Update jurisdiction role entity
    jurisdictionRoleEntity.participants = participants;
    jurisdictionRoleEntity.participantsCount = participantsCount;
    jurisdictionRoleEntity.save();
    // Update jurisdiction role accounts
    updateJurisdictionEntityRoles(
      jurisdictionEntity,
      event.params.id.toString(),
      participants,
      participantsCount,
    )
    // Update and avatar nft entity
    if (isTokenMinted) {
      addJurisdictionToAvatarNftEntity(event.params.toOwnerToken.toString(), jurisdictionEntity);
    }
    if (isTokenBurned) {
      removeJurisdctionFromAvatarEntity(event.params.fromOwnerToken.toString(), jurisdictionEntity);
    }
  }
}

/**
 * Handle a reaction created event to create case entity and case contract.
 */
export function handleReactionCreated(event: ReactionCreated): void {
  // Skip if case entity is exists
  if (CaseEntity.load(event.params.contractAddress.toHexString())) {
    return;
  }
  // Get jurisdiction
  let jurisdictionEntity = getJurisdictionEntity(event.address.toHexString());
  // Load case name from contract
  let caseContract = CaseContract.bind(event.params.contractAddress);
  let caseContractName = caseContract.name();
  // Create case entity
  let caseEntity = new CaseEntity(event.params.contractAddress.toHexString());
  caseEntity.name = caseContractName;
  caseEntity.createdDate = event.block.timestamp;
  caseEntity.jurisdiction = jurisdictionEntity.id;
  caseEntity.rules = [];
  caseEntity.participants = [];
  caseEntity.admins = [];
  caseEntity.subjects = [];
  caseEntity.plaintiffs = [];
  caseEntity.judges = [];
  caseEntity.witnesses = [];
  caseEntity.affecteds = [];
  caseEntity.participantsWithConfirmationPosts = [];
  caseEntity.save();
  // Create case contract for subgraph using template
  CaseTemplate.create(event.params.contractAddress);
  // Increase cases count
  jurisdictionEntity.casesCount = jurisdictionEntity.casesCount + 1;
  jurisdictionEntity.save();
}

/**
 * Handle a opinion change event to update avatar reputation.
 */
export function handleOpinionChange(event: OpinionChange): void {
  // Find avatar nft entity and return if not found
  let avatarNftEntity = AvatarNftEntity.load(event.params.tokenId.toString());
  if (!avatarNftEntity) {
    return;
  }
  // Get jurisdiction
  let jurisdictionEntity = getJurisdictionEntity(event.address.toHexString());
  // Find or create reputation entity
  let reputationEntityId = `${event.params.tokenId.toString()}_${
    jurisdictionEntity.id
  }_${event.params.domain.toString()}`;
  let reputationEntity = AvatarNftReputationEntity.load(reputationEntityId);
  if (!reputationEntity) {
    reputationEntity = new AvatarNftReputationEntity(reputationEntityId);
    reputationEntity.jurisdiction = jurisdictionEntity.id;
    reputationEntity.domain = event.params.domain;
    reputationEntity.avatarNft = avatarNftEntity.id;
    reputationEntity.negativeRating = BigInt.zero();
    reputationEntity.positiveRating = BigInt.zero();
  }
  // Update negative rating (rating=false)
  if (event.params.rating === false) {
    avatarNftEntity.totalNegativeRating = avatarNftEntity.totalNegativeRating.plus(
      event.params.score
    );
    reputationEntity.negativeRating = reputationEntity.negativeRating.plus(
      event.params.score
    );
  }
  // Update positive rating (rating=true)
  if (event.params.rating === true) {
    avatarNftEntity.totalPositiveRating = avatarNftEntity.totalPositiveRating.plus(
      event.params.score
    );
    reputationEntity.positiveRating = reputationEntity.positiveRating.plus(
      event.params.score
    );
  }
  // Save entities
  avatarNftEntity.save();
  reputationEntity.save();
}
