// Build a MyInvois UBL 2.1 JSON invoice (version 1.0, unsigned) from a
// supplier profile plus simple buyer/line inputs.

const M = (v) => [{ _: v }];
const MYR = (n) => [{ _: round2(n), currencyID: "MYR" }];
const round2 = (n) => Math.round(n * 100) / 100;

function party({ tin, idType = "BRN", idValue = "NA", sst = "NA", ttx = "NA", name, address, phone = "NA", email, msic, businessActivity }) {
  const a = address || {};
  return [{
    ...(msic ? { IndustryClassificationCode: [{ _: msic, name: businessActivity || "" }] } : {}),
    PartyIdentification: [
      { ID: [{ _: tin, schemeID: "TIN" }] },
      { ID: [{ _: idValue, schemeID: idType }] },
      { ID: [{ _: sst, schemeID: "SST" }] },
      { ID: [{ _: ttx, schemeID: "TTX" }] },
    ],
    PostalAddress: [{
      CityName: M(a.city || "NA"),
      PostalZone: M(a.postcode || "NA"),
      CountrySubentityCode: M(a.stateCode || "17"),
      AddressLine: [{ Line: M(a.line1 || "NA") }],
      Country: [{ IdentificationCode: [{ _: a.countryCode || "MYS", listID: "ISO3166-1", listAgencyID: "6" }] }],
    }],
    PartyLegalEntity: [{ RegistrationName: M(name) }],
    Contact: [{ Telephone: M(phone), ...(email ? { ElectronicMail: M(email) } : {}) }],
  }];
}

function taxBlock(taxable, taxAmount, category) {
  return [{
    TaxAmount: MYR(taxAmount),
    TaxSubtotal: [{
      TaxableAmount: MYR(taxable),
      TaxAmount: MYR(taxAmount),
      TaxCategory: [{
        ID: M(category),
        TaxScheme: [{ ID: [{ _: "OTH", schemeID: "UN/ECE 5153", schemeAgencyID: "6" }] }],
      }],
    }],
  }];
}

/**
 * @param profile   supplier profile (~/.myinvois-profile.json shape)
 * @param spec      { invoiceNumber, typeCode="01", buyer:{tin,idType,idValue,name,address,phone,email,sst},
 *                    lines:[{description, quantity=1, unitPrice, classificationCode="022", taxRate=0, taxCategory}],
 *                    currency="MYR" (only MYR supported for now) }
 */
export function buildInvoice(profile, spec) {
  const lines = (spec.lines || []).map((l, i) => {
    const qty = l.quantity ?? 1;
    const ext = round2(qty * l.unitPrice);
    const taxRate = l.taxRate ?? 0;
    const tax = round2(ext * taxRate);
    const category = l.taxCategory ?? (taxRate > 0 ? "02" : "06");
    return {
      ID: M(String(i + 1)),
      InvoicedQuantity: [{ _: qty, unitCode: l.unitCode || "C62" }],
      LineExtensionAmount: MYR(ext),
      TaxTotal: taxBlock(ext, tax, category),
      Item: [{
        CommodityClassification: [{ ItemClassificationCode: [{ _: l.classificationCode || "022", listID: "CLASS" }] }],
        Description: M(l.description),
      }],
      Price: [{ PriceAmount: MYR(l.unitPrice) }],
      ItemPriceExtension: [{ Amount: MYR(ext) }],
      _ext: ext, _tax: tax, _category: category,
    };
  });
  if (!lines.length) throw new Error("at least one invoice line is required");

  const subtotal = round2(lines.reduce((s, l) => s + l._ext, 0));
  const totalTax = round2(lines.reduce((s, l) => s + l._tax, 0));
  const total = round2(subtotal + totalTax);
  const headCategory = lines.find((l) => l._tax > 0)?._category ?? "06";
  for (const l of lines) { delete l._ext; delete l._tax; delete l._category; }

  const doc = {
    _D: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    _A: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    _B: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    Invoice: [{
      ID: M(spec.invoiceNumber),
      IssueDate: M("1970-01-01"),
      IssueTime: M("00:00:00Z"),
      InvoiceTypeCode: [{ _: spec.typeCode || "01", listVersionID: "1.0" }],
      DocumentCurrencyCode: M("MYR"),
      AccountingSupplierParty: [{
        Party: party({
          tin: profile.tin, idType: "BRN", idValue: profile.brn,
          sst: profile.sst || "NA", ttx: profile.ttx || "NA",
          name: profile.name, address: profile.address,
          phone: profile.phone, email: profile.email,
          msic: profile.msic, businessActivity: profile.businessActivity,
        }),
      }],
      AccountingCustomerParty: [{ Party: party(spec.buyer) }],
      TaxTotal: taxBlock(subtotal, totalTax, headCategory),
      LegalMonetaryTotal: [{
        LineExtensionAmount: MYR(subtotal),
        TaxExclusiveAmount: MYR(subtotal),
        TaxInclusiveAmount: MYR(total),
        PayableAmount: MYR(total),
      }],
      InvoiceLine: lines,
    }],
  };

  const summary = {
    invoiceNumber: spec.invoiceNumber,
    typeCode: spec.typeCode || "01",
    supplier: profile.name,
    buyer: spec.buyer.name,
    buyerTin: spec.buyer.tin,
    lines: (spec.lines || []).map((l) => `${l.description} × ${l.quantity ?? 1} @ RM${l.unitPrice}`),
    subtotal, totalTax, totalPayable: total, currency: "MYR",
  };
  return { doc, summary };
}
