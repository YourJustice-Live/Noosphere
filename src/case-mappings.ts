import { ByteArray, Bytes, ipfs, json } from "@graphprotocol/graph-ts";
import {
  CaseEntity,
  CaseEventEntity,
  CasePostEntity,
  CaseRoleEntity,
  JurisdictionRuleEntity,
} from "../generated/schema";
import {
  Cancelled,
  Post,
  RuleAdded,
  RuleConfirmed,
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
  // Add account to case participants if required
  if (!caseEntity.participantAccounts.includes(event.params.to)) {
    let caseParticipantAccounts = caseEntity.participantAccounts;
    caseParticipantAccounts.push(event.params.to);
    caseEntity.participantAccounts = caseParticipantAccounts;
    caseEntity.save();
  }
  // Find or create case role entity
  let caseRoleEntityId = `${event.address.toHexString()}_${event.params.id.toString()}`;
  let caseRoleEntity = CaseRoleEntity.load(caseRoleEntityId);
  if (!caseRoleEntity) {
    caseRoleEntity = new CaseRoleEntity(caseRoleEntityId);
    caseRoleEntity.caseEntity = caseEntity.id;
    caseRoleEntity.roleId = event.params.id;
    caseRoleEntity.accounts = [];
  }
  // Add event account to case entity accounts
  let accounts = caseRoleEntity.accounts;
  accounts.push(event.params.to);
  caseRoleEntity.accounts = accounts;
  caseRoleEntity.save();
  // Create case event
  let caseEventEntityId = `${event.address.toHexString()}_${event.transaction.hash.toHexString()}`;
  let caseEventEntity = new CaseEventEntity(caseEventEntityId);
  caseEventEntity.caseEntity = caseEntity.id;
  caseEventEntity.createdDate = event.block.timestamp;
  caseEventEntity.type = "accountGotRole";
  caseEventEntity.data = Bytes.fromByteArray(
    ByteArray.fromUTF8(
      `{"account":"${event.params.to.toHexString()}","role":"${event.params.id.toString()}"}`
    )
  );
  caseEventEntity.save();
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
  // Create case event
  let caseEventEntityId = `${event.address.toHexString()}_${event.transaction.hash.toHexString()}`;
  let caseEventEntity = new CaseEventEntity(caseEventEntityId);
  caseEventEntity.caseEntity = caseEntity.id;
  caseEventEntity.createdDate = event.block.timestamp;
  caseEventEntity.type = "accountAddedPost";
  caseEventEntity.data = Bytes.fromByteArray(
    ByteArray.fromUTF8(
      `{"account":"${event.params.account.toHexString()}","type":"${
        uriJsonTypeString ? uriJsonTypeString : "Unknown"
      }"}`
    )
  );
  caseEventEntity.save();
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
  // Create case event
  let caseEventEntityId = `${event.address.toHexString()}_${event.transaction.hash.toHexString()}`;
  let caseEventEntity = new CaseEventEntity(caseEventEntityId);
  caseEventEntity.caseEntity = caseEntity.id;
  caseEventEntity.createdDate = event.block.timestamp;
  caseEventEntity.type = "stageChanged";
  caseEventEntity.data = Bytes.fromByteArray(
    ByteArray.fromUTF8(`{"stage":"${event.params.stage}"}`)
  );
  caseEventEntity.save();
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
  // Create case event
  let caseEventEntityId = `${event.address.toHexString()}_${event.transaction.hash.toHexString()}`;
  let caseEventEntity = new CaseEventEntity(caseEventEntityId);
  caseEventEntity.caseEntity = caseEntity.id;
  caseEventEntity.createdDate = event.block.timestamp;
  caseEventEntity.type = "accountMadeVerdict";
  caseEventEntity.data = Bytes.fromByteArray(
    ByteArray.fromUTF8(`{"account":"${event.params.account.toHexString()}"}`)
  );
  caseEventEntity.save();
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
  // Create case event
  let caseEventEntityId = `${event.address.toHexString()}_${event.transaction.hash.toHexString()}`;
  let caseEventEntity = new CaseEventEntity(caseEventEntityId);
  caseEventEntity.caseEntity = caseEntity.id;
  caseEventEntity.createdDate = event.block.timestamp;
  caseEventEntity.type = "accountCancelledCase";
  caseEventEntity.data = Bytes.fromByteArray(
    ByteArray.fromUTF8(`{"account":"${event.params.account.toHexString()}"}`)
  );
  caseEventEntity.save();
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
  // Skip if rule not exists
  let ruleEntity = JurisdictionRuleEntity.load(event.params.ruleId.toString());
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
