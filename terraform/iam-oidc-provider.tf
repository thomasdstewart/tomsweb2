module "iam_oidc_provider" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-oidc-provider"
  version = "6.5.0"

  url = "https://gitlab.com"
}
