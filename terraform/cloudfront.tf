module "cloudfront" {
  source  = "terraform-aws-modules/cloudfront/aws"
  version = "6.2.0"

  aliases = [
    "stewarts.org.uk",
    "www.stewarts.org.uk",
    "mta-sts.stewarts.org.uk"
  ]

  comment             = "stewarts.org.uk"
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = "PriceClass_All"
  retain_on_delete    = false
  wait_for_deployment = false

  origin = {
    "tomsweb2-maekeofieshu" = {
      domain_name = module.s3_bucket.s3_bucket_website_endpoint
      custom_origin_config = {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "http-only"
        origin_ssl_protocols   = ["TLSv1.2"]

      }
    }
  }

  default_cache_behavior = {
    target_origin_id       = "tomsweb2-maekeofieshu"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    compress                     = true
    cache_policy_name            = "Managed-CachingOptimized"
    response_headers_policy_name = "Managed-SecurityHeadersPolicy"
    use_forwarded_values         = false
  }

  viewer_certificate = {
    acm_certificate_arn      = aws_acm_certificate.acm_certificate.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
