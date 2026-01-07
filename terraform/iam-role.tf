module "iam_github_oidc_role_devops" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role"
  version = "6.2.3"

  use_name_prefix    = false
  name               = "devops"
  enable_github_oidc = true

  oidc_wildcard_subjects = [
    "repo:thomasdstewart/tomsweb2:ref:refs/heads/main",
    "repo:thomasdstewart/tomsweb2:ref:refs/*",
  ]

  policies = {
    devops = aws_iam_policy.devops.arn
  }
}

resource "aws_iam_policy" "devops" {
  name   = "devops"
  policy = data.aws_iam_policy_document.devops.json
}

data "aws_iam_policy_document" "devops" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:DeleteObject",
      "s3:GetBucketLocation",
      "s3:RestoreObject"
    ]
    resources = [
      "${module.s3_bucket.s3_bucket_arn}",
      "${module.s3_bucket.s3_bucket_arn}/*"
    ]
  }
}
