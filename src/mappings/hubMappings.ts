import { ContractCreated } from "../../generated/Hub/Hub";
import { Jurisdiction as JurisdictionContract } from "../../generated/Hub/Jurisdiction";
import { Jurisdiction as JurisdictionTemplate } from "../../generated/templates";
import { JURISDICTION_CONTRACT_TYPE_NAME } from "../constants";
import { getJurisdictionEntity } from "../utils";

export function handleContractCreated(event: ContractCreated): void {
  // If created jurisdiction contract
  if (event.params.name == JURISDICTION_CONTRACT_TYPE_NAME) {
    // Get (or create) jurisdiction entity
  let jurisdictionEntity = getJurisdictionEntity(
    event.params.contractAddress.toHexString()
  );
  // Load jurisdiction name from contract
  let jurisdictionContract = JurisdictionContract.bind(
    event.params.contractAddress
  );
  let jurisdictionContractName = jurisdictionContract.name();
  // Update jurisdiction entity
  jurisdictionEntity.name = jurisdictionContractName;
  jurisdictionEntity.save();
  // Create jurisdiction contract for subgraph using template
  JurisdictionTemplate.create(event.params.contractAddress);
  }
}
