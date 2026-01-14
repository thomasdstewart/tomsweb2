module "iam_github_oidc_role_devops" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role"
  version = "6.3.0"

  use_name_prefix = false
  name            = "devops"

  trust_policy_permissions = {
    GitlLabOidcAuth = {
      actions = [
        "sts:AssumeRoleWithWebIdentity",
      ]

      principals = [{
        type = "Federated"
        identifiers = [
          module.iam_oidc_provider.arn
        ]
      }]

      condition = [{
        test     = "StringEquals"
        variable = "gitlab.com:sub"
        values = [
          "project_path:thomasdstewart/tomsweb2:ref_type:branch:ref:main",
        ]
      }]
    }
  }

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
  statement {
    effect = "Allow"
    actions = [
      "cloudfront:CreateInvalidation"
    ]
    resources = [
      "${module.cloudfront.cloudfront_distribution_arn}"
    ]
  }
}
