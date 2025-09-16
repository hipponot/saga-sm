#### Learning the Deployware 9/16

```
# quick-start.sh expects github PAT in in the env variable below
export GITHUB_TOKEN=xxxxx
```

The local vs remote repo toggle script is

```
# toggle to cross repo development with saga-soa local
 scripts/dev-setup.sh local
```

You need to `aws sso login` before attempting deploy

