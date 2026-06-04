module "iam_oidc_provider" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-oidc-provider"
  version = "6.6.1"

  url = "https://gitlab.com"
}
