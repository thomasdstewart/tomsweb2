module "s3_bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "5.9.1"

  bucket                  = "tomsweb2-uwunuithaesa"
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false

  website = {
    index_document = "index.html"
    error_document = "index.html"
  }
}

resource "aws_s3_bucket_policy" "s3_bucket_policy" {
  bucket = module.s3_bucket.s3_bucket_id
  policy = data.aws_iam_policy_document.s3_bucket_policy_document.json
}

data "aws_iam_policy_document" "s3_bucket_policy_document" {
  statement {
    effect  = "Allow"
    actions = ["s3:GetObject"]
    resources = [
      "${module.s3_bucket.s3_bucket_arn}",
      "${module.s3_bucket.s3_bucket_arn}/*"
    ]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }
}
