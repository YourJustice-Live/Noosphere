import { Address, BigInt } from "@graphprotocol/graph-ts";
import { TransferSingle } from "../generated/Jurisdiction/Jurisdiction";
import { JurisdictionParticipantEntity } from "../generated/schema";

/**
 * Handle a tranfer single event to create or update a participant of jurisdiction.
 */
export function handleTransferSingle(event: TransferSingle): void {
  let isTokenMinted = event.params.from.equals(Address.zero());
  let isTokenBurned = event.params.to.equals(Address.zero());
  if (isTokenMinted || isTokenBurned) {
    let account = isTokenMinted
      ? event.params.to.toHexString()
      : event.params.from.toHexString();
    let entity = JurisdictionParticipantEntity.load(account);
    if (!entity) {
      entity = new JurisdictionParticipantEntity(account);
    }
    if (event.params.id.equals(BigInt.fromString("1"))) {
      entity.isAdmin = isTokenMinted ? true : false;
    }
    if (event.params.id.equals(BigInt.fromString("2"))) {
      entity.isMember = isTokenMinted ? true : false;
    }
    if (event.params.id.equals(BigInt.fromString("3"))) {
      entity.isJudge = isTokenMinted ? true : false;
    }
    entity.save();
  }
}
