# MyInvois — every endpoint as curl

From the official Postman collection (`postman/EInvoicing-SDK.postman_collection.json`,
downloaded from https://sdk.myinvois.hasil.gov.my/postman/) plus the two newer
endpoints documented only on the SDK site.

```sh
# Sandbox; for production use api.myinvois.hasil.gov.my
BASE=https://preprod-api.myinvois.hasil.gov.my
```

## Platform

```sh
# 1. Login as Taxpayer System → access_token (valid 60 min, cache it!)
curl -s -X POST "$BASE/connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&grant_type=client_credentials&scope=InvoicingAPI"

# 2. Login as Intermediary System (acting on behalf of a taxpayer)
#    Same as above + header:
#      -H "onbehalfof: <taxpayer TIN>"

# 3. Get all document types
curl -s "$BASE/api/v1.0/documenttypes" -H "Authorization: Bearer $TOKEN"

# 4. Get one document type (structure definitions)
curl -s "$BASE/api/v1.0/documenttypes/{id}" -H "Authorization: Bearer $TOKEN"

# 5. Get document type version
curl -s "$BASE/api/v1.0/documenttypes/{id}/versions/{vid}" -H "Authorization: Bearer $TOKEN"

# 6. Get notifications
curl -s "$BASE/api/v1.0/notifications/taxpayer?dateFrom=&dateTo=&type=&language=&status=&channel=&pageNo=&pageSize=" \
  -H "Authorization: Bearer $TOKEN"
```

## e-Invoicing

```sh
# 7. Validate taxpayer TIN (200 = valid, 404 = not found)
curl -s -o /dev/null -w "%{http_code}" \
  "$BASE/api/v1.0/taxpayer/validate/{tin}?idType=BRN&idValue={brn}" \
  -H "Authorization: Bearer $TOKEN"

# 8. Search taxpayer TIN (reverse lookup: NRIC/BRN/name → TIN)
curl -s "$BASE/api/v1.0/taxpayer/search/tin?idType=NRIC&idValue=770625015324" \
  -H "Authorization: Bearer $TOKEN"
#   optional: &taxpayerName=...&fileType=1 (1 individual, 2 company). 60 RPM limit.

# 9. Submit documents (JSON format; hash = sha256 hex of exact document bytes)
curl -s -X POST "$BASE/api/v1.0/documentsubmissions" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"documents":[{"format":"JSON","codeNumber":"INV12345","documentHash":"<sha256hex>","document":"<base64>"}]}'

# 10. Get submission status (poll until overallStatus != InProgress)
curl -s "$BASE/api/v1.0/documentsubmissions/{submissionUid}" -H "Authorization: Bearer $TOKEN"

# 11. Get document (raw source + metadata)
curl -s "$BASE/api/v1.0/documents/{uuid}/raw" -H "Authorization: Bearer $TOKEN"

# 12. Get document details (validation results, longId)
curl -s "$BASE/api/v1.0/documents/{uuid}/details" -H "Authorization: Bearer $TOKEN"

# 13. Cancel document (issuer, within 72h)
curl -s -X PUT "$BASE/api/v1.0/documents/state/{uuid}/state" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"cancelled","reason":"wrong amount"}'

# 14. Reject document (buyer requests cancellation — same endpoint, different status)
curl -s -X PUT "$BASE/api/v1.0/documents/state/{uuid}/state" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"rejected","reason":"not my purchase"}'

# 15. Get recent documents (last 31 days)
curl -s "$BASE/api/v1.0/documents/recent?pageNo=1&pageSize=20&direction=Sent&status=Valid" \
  -H "Authorization: Bearer $TOKEN"
#   more filters: submissionDateFrom/To, issueDateFrom/To, documentType,
#   receiverIdType/receiverId/receiverTin, issuerTin/issuerIdType/issuerId

# 16. Search documents (wider than 31 days, filterable)
curl -s "$BASE/api/v1.0/documents/search?pageNo=1&pageSize=20&submissionDateFrom=2026-06-01T00:00:00Z&submissionDateTo=2026-07-01T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN"

# 17. Taxpayer QR code info (decoded Base64 string from a scanned taxpayer QR)
curl -s "$BASE/api/v1.0/taxpayers/qrcodeinfo/{qrCodeText}" -H "Authorization: Bearer $TOKEN"
```
