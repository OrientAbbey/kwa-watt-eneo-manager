import { describe, it, expect } from "vitest";
import { telHref, smsHref, whatsappHref, invoiceRequestText } from "./contact";

describe("liens d'action", () => {
  it("encode correctement les codes USSD", () => {
    expect(telHref("*126#")).toBe("tel:*126%23");
    expect(telHref("#150*314*1#")).toBe("tel:%23150*314*1%23");
  });
  it("construit un lien SMS avec ou sans corps", () => {
    expect(smsHref("8010")).toBe("sms:8010");
    expect(smsHref("8010", "12345 6")).toBe("sms:8010?body=12345%206");
  });
  it("construit un lien WhatsApp international", () => {
    expect(whatsappHref("237", "699119911")).toBe("https://wa.me/237699119911");
    expect(whatsappHref("+237", "699 11 99 11", "Bonjour")).toBe("https://wa.me/237699119911?text=Bonjour");
  });
  it("préfère le numéro de contrat au numéro de compteur", () => {
    expect(invoiceRequestText("C123", "M456")).toBe("C123");
    expect(invoiceRequestText("", "M456")).toBe("M456");
    expect(invoiceRequestText()).toBe("");
  });
});
