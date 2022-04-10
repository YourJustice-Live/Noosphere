import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  CaseEntity,
  CaseParticipantEntity,
  CasePostEntity,
  JurisdictionRuleEntity,
} from "../generated/schema";
import {
  Post,
  RuleAdded,
  Stage,
  TransferSingle,
  Verdict,
} from "../generated/templates/Case/Case";

/**
 * Handle a transfer single event to add a role to case participant.
 */
export function handleTransferSingle(event: TransferSingle): void {
  // Skip if case entity not exists
  let caseEntity = CaseEntity.load(event.address.toHexString());
  if (!caseEntity) {
    return;
  }
  // Define participant entity id (case address + account address)
  let caseParticipantEntityId = `${event.address.toHexString()}_${event.params.to.toHexString()}`;
  // Find or create participant entity
  let caseParticipantEntity = CaseParticipantEntity.load(
    caseParticipantEntityId
  );
  if (!caseParticipantEntity) {
    caseParticipantEntity = new CaseParticipantEntity(caseParticipantEntityId);
    caseParticipantEntity.caseEntity = caseEntity.id;
    caseParticipantEntity.account = event.params.to;
  }
  // Add role to participant entity
  if (event.params.id.equals(BigInt.fromString("1"))) {
    caseParticipantEntity.isAdmin = true;
  }
  if (event.params.id.equals(BigInt.fromString("2"))) {
    caseParticipantEntity.isSubject = true;
  }
  if (event.params.id.equals(BigInt.fromString("3"))) {
    caseParticipantEntity.isPlaintiff = true;
  }
  if (event.params.id.equals(BigInt.fromString("4"))) {
    caseParticipantEntity.isJudge = true;
  }
  if (event.params.id.equals(BigInt.fromString("5"))) {
    caseParticipantEntity.isWitness = true;
  }
  if (event.params.id.equals(BigInt.fromString("6"))) {
    caseParticipantEntity.isAffected = true;
  }
  caseParticipantEntity.save();
}

/**
 * Handle a rule added event to add a rule to case.
 */
export function handleRuleAdded(event: RuleAdded): void {
  // Skip if case entity not exists
  let caseEntity = CaseEntity.load(event.address.toHexString());
  if (!caseEntity) {
    return;
  }
  // Skip if rule entity not exists
  let ruleEntity = JurisdictionRuleEntity.load(event.params.ruleId.toString());
  if (!ruleEntity) {
    return;
  }
  // Add rule to case entity
  let caseEntityRules = caseEntity.rules;
  caseEntityRules.push(ruleEntity.id);
  caseEntity.rules = caseEntityRules;
  caseEntity.save();
}

/**
 * Handle a post event to add a post to case.
 */
export function handlePost(event: Post): void {
  // Skip if case entity not exists
  let caseEntity = CaseEntity.load(event.address.toHexString());
  if (!caseEntity) {
    return;
  }
  // Create post entity
  let casePostEntity = new CasePostEntity(event.transaction.hash.toHexString());
  casePostEntity.caseEntity = caseEntity.id;
  casePostEntity.entityRole = event.params.entRole.toString();
  casePostEntity.postRole = event.params.postRole;
  casePostEntity.uri = event.params.uri;
  casePostEntity.save();
}

/**
 * Handle a stage event to update case stage.
 */
export function handleStage(event: Stage): void {
  // Skip if case entity not exists
  let caseEntity = CaseEntity.load(event.address.toHexString());
  if (!caseEntity) {
    return;
  }
  // Update case stage
  caseEntity.stage = event.params.stage;
  caseEntity.save();
}

/**
 * Handle a verdict event to set case verdict uri.
 */
export function handleVerdict(event: Verdict): void {
  // Skip if case entity not exists
  let caseEntity = CaseEntity.load(event.address.toHexString());
  if (!caseEntity) {
    return;
  }
  // Set case verdict uri
  caseEntity.verdictUri = event.params.uri;
  caseEntity.save();
}
