"""Optionally upload the finished report to S3-compatible storage (AWS S3, Cloudflare R2,
Backblaze B2, ...) and return a private, unguessable, expiring link you can open from
anywhere (phone, iPad). Nothing is public: access is by the presigned URL only.

Configure with environment variables:
  FILM_REVIEW_BUCKET        bucket name (required to enable publishing)
  FILM_REVIEW_ENDPOINT      endpoint URL for non-AWS stores, e.g. https://<acct>.r2.cloudflarestorage.com
  FILM_REVIEW_LINK_DAYS     link lifetime in days (default 7; S3/R2 maximum is 7)
  AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY   credentials (R2/B2 issue S3-style keys)
"""
from __future__ import annotations

import os
import secrets
from pathlib import Path


def enabled() -> bool:
    return bool(os.environ.get("FILM_REVIEW_BUCKET"))


def publish(report: Path, name: str) -> str:
    import boto3
    from botocore.config import Config as BotoConfig

    bucket = os.environ["FILM_REVIEW_BUCKET"]
    days = min(max(int(os.environ.get("FILM_REVIEW_LINK_DAYS", "7")), 1), 7)
    endpoint = os.environ.get("FILM_REVIEW_ENDPOINT") or None
    s3 = boto3.client("s3", endpoint_url=endpoint, config=BotoConfig(signature_version="s3v4"),
                      region_name=os.environ.get("AWS_REGION") or ("auto" if endpoint else None))
    key = f"reports/{name}-{secrets.token_urlsafe(12)}.html"
    s3.upload_file(str(report), bucket, key, ExtraArgs={
        "ContentType": "text/html; charset=utf-8", "ContentDisposition": "inline"})
    return s3.generate_presigned_url("get_object", Params={"Bucket": bucket, "Key": key},
                                     ExpiresIn=days * 86400)
