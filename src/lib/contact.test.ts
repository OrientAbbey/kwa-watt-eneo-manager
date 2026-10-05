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

import { buildUssdPayment } from "./contact";

describe("buildUssdPayment", () => {
  const MTN = "*126*2*1*2*{meter}*{amount}#";
  const ORANGE = "#150*3*1*4*1*{meter}*{amount}#";
  it("construit les codes globaux MTN et Orange indiqués", () => {
    expect(buildUssdPayment(MTN, "01234567852", 3000)).toBe("*126*2*1*2*01234567852*3000#");
    expect(buildUssdPayment(ORANGE, "98765432109", 2000)).toBe("#150*3*1*4*1*98765432109*2000#");
  });
  it("donne un lien tel: valide (le # est encodé)", () => {
    expect(telHref(buildUssdPayment(MTN, "01234567852", 3000)!)).toBe("tel:*126*2*1*2*01234567852*3000%23");
    expect(telHref(buildUssdPayment(ORANGE, "98765432109", 2000)!)).toBe("tel:%23150*3*1*4*1*98765432109*2000%23");
  });
  it("tolère des espaces ou tirets dans le numéro de compteur saisi", () => {
    expect(buildUssdPayment(MTN, "0123 4567 852", 1000)).toBe("*126*2*1*2*01234567852*1000#");
    expect(buildUssdPayment(MTN, "0123-4567-852", 1000)).toBe("*126*2*1*2*01234567852*1000#");
  });
  it("refuse tout ce qui pourrait altérer le code composé", () => {
    expect(buildUssdPayment(MTN, "0123*4567#852", 3000)).toBeNull();
    expect(buildUssdPayment(MTN, "01234567852", 3000.5)).toBeNull();
    expect(buildUssdPayment(MTN, "01234567852", -1)).toBeNull();
    expect(buildUssdPayment(MTN, "01234567852", 0)).toBeNull();
    expect(buildUssdPayment(MTN, "abc", 3000)).toBeNull();
    expect(buildUssdPayment(MTN, "1234", 3000)).toBeNull();
    expect(buildUssdPayment(MTN, "01234567852", NaN)).toBeNull();
  });
  it("refuse un modèle sans les deux champs", () => {
    expect(buildUssdPayment("*126#", "01234567852", 3000)).toBeNull();
  });
});
