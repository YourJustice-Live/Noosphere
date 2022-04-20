# Your Justice Subgraph

## Commands

- Init project: `graph init --product hosted-service`
- Install dependencies: `yarn install`
- Set deployment key: `yarn auth`
- Update generated code: `yarn codegen`
- Deploy to development subgraph: `yarn deploy`
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
