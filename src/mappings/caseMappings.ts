import { ipfs, json, log } from "@graphprotocol/graph-ts";
import {
  CaseEntity,
  CasePostEntity,
  JurisdictionRuleEntity,
} from "../../generated/schema";
import {
  Cancelled,
  Post,
  RuleAdded,
  RuleConfirmed,
  Stage,
  TransferSingle,
  Verdict,
} from "../../generated/templates/Case/Case";
import {
  CASE_POST_TYPE_CONFIRMATION,
  CASE_ROLE_ADMIN_ID,
  CASE_ROLE_AFFECTED_ID,
  CASE_ROLE_JUDGE_ID,
  CASE_ROLE_PLAINTIFF_ID,
  CASE_ROLE_SUBJECT_ID,
  CASE_ROLE_WITNESS_ID,
} from "../constants";
import { addCaseToAvatarNftEntity, saveCaseEventEntity } from "../utils";

/**
 * Handle a transfer single event to add a role to case participant.
 */
export function handleTransferSingle(event: TransferSingle): void {
  // Skip if case entity not exists
  let caseEntity = CaseEntity.load(event.address.toHexString());
  if (!caseEntity) {
    return;
  }
  // Add account to case participant accounts
  if (!caseEntity.participantAccounts.includes(event.params.to)) {
    let accounts = caseEntity.participantAccounts;
    accounts.push(event.params.to);
    caseEntity.participantAccounts = accounts;
  }
  // Add account to case role accounts
  if (
    event.params.id.toString() == CASE_ROLE_ADMIN_ID &&
    !caseEntity.adminAccounts.includes(event.params.to)
  ) {
    let accounts = caseEntity.adminAccounts;
    accounts.push(event.params.to);
    caseEntity.adminAccounts = accounts;
  }
  if (
    event.params.id.toString() == CASE_ROLE_SUBJECT_ID &&
    !caseEntity.subjectAccounts.includes(event.params.to)
  ) {
    let accounts = caseEntity.subjectAccounts;
    accounts.push(event.params.to);
    caseEntity.subjectAccounts = accounts;
  }
  if (
    event.params.id.toString() == CASE_ROLE_PLAINTIFF_ID &&
    !caseEntity.plaintiffAccounts.includes(event.params.to)
  ) {
    let accounts = caseEntity.plaintiffAccounts;
    accounts.push(event.params.to);
    caseEntity.plaintiffAccounts = accounts;
  }
  if (
    event.params.id.toString() == CASE_ROLE_JUDGE_ID &&
    !caseEntity.judgeAccounts.includes(event.params.to)
  ) {
    let accounts = caseEntity.judgeAccounts;
    accounts.push(event.params.to);
    caseEntity.judgeAccounts = accounts;
  }
  if (
    event.params.id.toString() == CASE_ROLE_WITNESS_ID &&
    !caseEntity.witnessAccounts.includes(event.params.to)
  ) {
    let accounts = caseEntity.witnessAccounts;
    accounts.push(event.params.to);
    caseEntity.witnessAccounts = accounts;
  }
  if (
    event.params.id.toString() == CASE_ROLE_AFFECTED_ID &&
    !caseEntity.affectedAccounts.includes(event.params.to)
  ) {
    let accounts = caseEntity.affectedAccounts;
    accounts.push(event.params.to);
    caseEntity.affectedAccounts = accounts;
  }
  caseEntity.save();
  // Save case event entity
  saveCaseEventEntity(
    caseEntity,
    event.address,
    event.transaction.hash,
    event.block.timestamp,
    "accountGotRole",
    `{"account":"${event.params.to.toHexString()}","role":"${event.params.id.toString()}"}`
  );
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
  let ruleEntityId = `${
    caseEntity.jurisdiction
  }_${event.params.ruleId.toString()}`;
  let ruleEntity = JurisdictionRuleEntity.load(ruleEntityId);
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
  // Load uri data
  let uriIpfsHash = event.params.uri.split("/").at(-1);
  let uriData = ipfs.cat(uriIpfsHash);
  // Get type from uri data
  let uriParseResult = uriData ? json.try_fromBytes(uriData) : null;
  let uriJsonObject =
    uriParseResult && uriParseResult.isOk
      ? uriParseResult.value.toObject()
      : null;
  let uriJsonType = uriJsonObject ? uriJsonObject.get("type") : null;
  let uriJsonTypeString = uriJsonType ? uriJsonType.toString() : null;
  // Define case post entity id (case address + post transaction address)
  let casePostEntityId = `${event.address.toHexString()}_${event.transaction.hash.toHexString()}`;
  // Create post entity
  let casePostEntity = new CasePostEntity(casePostEntityId);
  casePostEntity.author = event.params.account;
  casePostEntity.createdDate = event.block.timestamp;
  casePostEntity.caseEntity = caseEntity.id;
  casePostEntity.entityRole = event.params.entRole.toString();
  casePostEntity.uri = event.params.uri;
  casePostEntity.uriData = uriData;
  casePostEntity.uriType = uriJsonTypeString;
  casePostEntity.save();
  // Save author account in case if the post is confirmation
  if (uriJsonTypeString == CASE_POST_TYPE_CONFIRMATION) {
    let accounts = caseEntity.accountsWithConfirmationPosts;
    accounts.push(event.params.account);
    caseEntity.accountsWithConfirmationPosts = accounts;
    caseEntity.save();
  }
  // Save case event entity
  saveCaseEventEntity(
    caseEntity,
    event.address,
    event.transaction.hash,
    event.block.timestamp,
    "accountAddedPost",
    `{"account":"${event.params.account.toHexString()}","type":"${
      uriJsonTypeString ? uriJsonTypeString : "Unknown"
    }"}`
  );
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
  // Save case event entity
  saveCaseEventEntity(
    caseEntity,
    event.address,
    event.transaction.hash,
    event.block.timestamp,
    "stageChanged",
    `{"stage":"${event.params.stage}"}`
  );
}

/**
 * Handle a verdict event to set case verdict params.
 */
export function handleVerdict(event: Verdict): void {
  // Skip if case entity not exists
  let caseEntity = CaseEntity.load(event.address.toHexString());
  if (!caseEntity) {
    return;
  }
  // Load uri data
  let uriIpfsHash = event.params.uri.split("/").at(-1);
  let uriData = ipfs.cat(uriIpfsHash);
  // Set case verdict params
  caseEntity.verdictAuthor = event.params.account;
  caseEntity.verdictUri = event.params.uri;
  caseEntity.verdictUriData = uriData;
  caseEntity.save();
  // Add case to subjects' avatar nft entities
  for (let i = 0; i < caseEntity.subjectAccounts.length; i++) {
    addCaseToAvatarNftEntity(caseEntity.subjectAccounts[i], caseEntity);
  }
  // Save case event entity
  saveCaseEventEntity(
    caseEntity,
    event.address,
    event.transaction.hash,
    event.block.timestamp,
    "accountMadeVerdict",
    `{"account":"${event.params.account.toHexString()}"}`
  );
}

/**
 * Handle a cancelled event to set case cancellation params.
 */
export function handleCancelled(event: Cancelled): void {
  // Skip if case entity not exists
  let caseEntity = CaseEntity.load(event.address.toHexString());
  if (!caseEntity) {
    return;
  }
  // Load uri data
  let uriIpfsHash = event.params.uri.split("/").at(-1);
  let uriData = ipfs.cat(uriIpfsHash);
  // Set case cancellation params
  caseEntity.cancellationAuthor = event.params.account;
  caseEntity.cancellationUri = event.params.uri;
  caseEntity.cancellationUriData = uriData;
  caseEntity.save();
  // Save case event entity
  saveCaseEventEntity(
    caseEntity,
    event.address,
    event.transaction.hash,
    event.block.timestamp,
    "accountCancelledCase",
    `{"account":"${event.params.account.toHexString()}"}`
  );
}

/**
 * Handle a rule confirmed event to add rule to verdict confirmed rules.
 */
export function handleRuleConfirmed(event: RuleConfirmed): void {
  // Skip if case entity not exists
  let caseEntity = CaseEntity.load(event.address.toHexString());
  if (!caseEntity) {
    return;
  }
  // Find rule and skip if rule not exists
  let caseEntityRuleIndex = event.params.ruleId.toU32() - 1;
  let ruleEntityId = caseEntity.rules[caseEntityRuleIndex];
  let ruleEntity = JurisdictionRuleEntity.load(ruleEntityId);
  if (!ruleEntity) {
    return;
  }
  // Add rule to case
  let verdictConfirmedRules = caseEntity.verdictConfirmedRules;
  if (!verdictConfirmedRules) {
    verdictConfirmedRules = [];
  }
  verdictConfirmedRules.push(ruleEntity.id);
  caseEntity.verdictConfirmedRules = verdictConfirmedRules;
  caseEntity.save();
}
