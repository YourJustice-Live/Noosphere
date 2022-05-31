# Your Justice Subgraph

## Commands

- Install Graph CLI: `yarn global add @graphprotocol/graph-cli`
- Install dependencies: `yarn install`
- Set deployment key: `graph auth`
- Update generated code: `yarn codegen`
- Deploy to development subgraph: `yarn deploy-dev`
- Deploy to sandbox subgraph: `yarn deploy-sandbox`
- Deploy to production subgraph: `graph deploy --node https://api.thegraph.com/deploy/ kiv1n/yourjustice`

## Subgraph

- Development - https://thegraph.com/hosted-service/subgraph/kiv1n/yourjustice-dev
- Production - https://thegraph.com/hosted-service/subgraph/kiv1n/yourjustice

## Links

- GraphQL API Docs - https://thegraph.com/docs/en/developer/graphql-api/

## Query for check the latest block a subgraph has indexed

```
{_meta{block{number}}}
```
