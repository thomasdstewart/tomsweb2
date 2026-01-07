resource "aws_acm_certificate" "acm_certificate" {
  domain_name = "stewarts.org.uk"
  subject_alternative_names = [
    "www.stewarts.org.uk",
    "mta-sts.stewarts.org.uk"
  ]

  validation_method = "DNS"
}
