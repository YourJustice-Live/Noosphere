## Commands

- Init project: `graph init --product hosted-service`
- Install dependencies: `yarn install`
- Update generated code: `yarn codegen`
- Deploy subgraph: `yarn deploy`

## Links

- Subgraph - https://thegraph.com/hosted-service/subgraph/kiv1n/yourjustice

## Useful Information

```
Note: If a handler doesn't require existing field values, it is faster
_not_ to load the entity from the store. Instead, create it fresh with
`new Entity(...)`, set the fields that should be updated and save the
entity back to the store. Fields that were not set or unset remain
unchanged, allowing for partial updates to be applied.

It is also possible to access smart contracts from mappings. For
example, the contract that has emitted the event can be connected to
with:

let contract = Contract.bind(event.address)

The following functions can then be called on this contract to access
state variables and other data:

- contract.add(...)
- contract.balanceOf(...)
- contract.getApproved(...)
- contract.getRepForDomain(...)
- contract.isApprovedForAll(...)
- contract.mint(...)
- contract.name(...)
- contract.onERC721Received(...)
- contract.owner(...)
- contract.ownerOf(...)
- contract.supportsInterface(...)
- contract.symbol(...)
- contract.tokenURI(...)
- contract.update(...)
```