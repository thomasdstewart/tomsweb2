# Tom Plat TomsWeb

```
aws sso login --sso-session tomplat
aws --profile AWSAdministratorAccess-TomsWeb-TomPlat --region us-east-1 cloudformation create-stack --stack-name terraform-state-bucket --template-body file://terraform-state-bucket.yaml
aws --profile AWSAdministratorAccess-TomsWeb-TomPlat s3 ls

export AWS_PROFILE=AWSAdministratorAccess-TomsWeb-TomPlat
tfall
```
