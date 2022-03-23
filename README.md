## Commands

- Init project: `graph init --product hosted-service`
- Install dependencies: `yarn install`
- Set deployment key: `yarn auth`
- Update generated code: `yarn codegen`
- Deploy subgraph: `yarn deploy`

## Subgraph

- Simple UI - https://thegraph.com/hosted-service/subgraph/kiv1n/yourjustice
- Advanced UI - https://api.thegraph.com/subgraphs/name/kiv1n/yourjustice/graphql

## Links

- GraphQL API Docs - https://thegraph.com/docs/en/developer/graphql-api/

## Query for check the latest block a subgraph has indexed

```
{_meta{block{number}}}
```
